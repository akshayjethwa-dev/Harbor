// src/components/poll/NudgeSection.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeToNudges,
  sendNudge,
  getPollVotes,
} from "../../services/pollService";
import { getUsersByIds } from "../../services/userService";
import { GarbaCrewUser } from "../../types/user";
import { NudgeRecord } from "../../types/poll";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  pollId: string;
  organizerId: string;
  participantUids: string[];
}

// Robust helper to handle Firestore Timestamp, standard Date, or string
function getMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  return new Date(ts).getTime();
}

function timeAgo(ts: any): string {
  const ms = getMillis(ts);
  if (!ms) return "";
  
  const diffHrs = Math.floor((Date.now() - ms) / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs === 1) return "1h ago";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    header: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
      marginBottom: 4,
    },
    sub: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    avatarInitial: { fontSize: 14, fontWeight: "700", color: c.textMuted },
    nameCol: { flex: 1 },
    name: { fontSize: 14, fontWeight: "600", color: c.text },
    historyText: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    nudgeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.primary + "11",
      borderWidth: 1,
      borderColor: c.primary + "33",
    },
    nudgeBtnText: { fontSize: 12, fontWeight: "700", color: c.primary },
    nudgeBtnDisabled: {
      backgroundColor: c.bgSubtle,
      borderColor: c.border,
    },
    nudgeBtnTextDisabled: {
      color: c.textMuted,
    },
    empty: {
      fontSize: 12,
      color: c.textMuted,
      fontStyle: "italic",
    },
  });

export default function NudgeSection({
  pollId,
  organizerId,
  participantUids,
}: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [users, setUsers] = useState<GarbaCrewUser[]>([]);
  const [voters, setVoters] = useState<string[]>([]);
  const [nudges, setNudges] = useState<Record<string, NudgeRecord>>({});
  const [loading, setLoading] = useState(true);
  const [nudgingUid, setNudgingUid] = useState<string | null>(null);

  const isOrganizer = user?.uid === organizerId;

  // Load users + initial votes
  useEffect(() => {
    if (!isOrganizer || !participantUids.length) {
      setLoading(false);
      return;
    }
    let mounted = true;

    const fetchData = async () => {
      try {
        const [fetchedUsers, fetchedVoters] = await Promise.all([
          getUsersByIds(participantUids),
          getPollVotes(pollId),
        ]);
        if (mounted) {
          setUsers(fetchedUsers);
          setVoters(fetchedVoters);
        }
      } catch (e) {
        console.warn("NudgeSection fetch failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();

    return () => {
      mounted = false;
    };
  }, [isOrganizer, participantUids, pollId]);

  // Subscribe to nudge history
  useEffect(() => {
    if (!isOrganizer) return;
    const unsub = subscribeToNudges(pollId, setNudges);
    return () => unsub();
  }, [isOrganizer, pollId]);

  // Compute non-voters
  const nonVoters = useMemo(() => {
    const now = Date.now();
    return users.filter((u) => {
      // 1. Must be a participant
      if (!participantUids.includes(u.uid)) return false;
      // 2. Must NOT have voted
      if (voters.includes(u.uid)) return false;
      // 3. Must not be banned
      if (u.isBanned) return false;
      // 4. Must not be suspended (Using getMillis to bypass TS Date/Timestamp errors)
      if (u.suspendedUntil) {
        const suspendedMs = getMillis(u.suspendedUntil);
        if (suspendedMs > now) return false;
      }
      return true;
    });
  }, [users, voters, participantUids]);

  if (!isOrganizer || loading) return null;
  if (nonVoters.length === 0) return null; // Everyone voted!

  const handleNudge = async (uid: string) => {
    if (!user?.uid) return;
    setNudgingUid(uid);
    try {
      await sendNudge(pollId, uid, user.uid);
    } catch (e: any) {
      Alert.alert("Couldn't send nudge", e?.message ?? "Try again.");
    } finally {
      // Clear UI spinner after a short delay, CF handles the rest
      setTimeout(() => setNudgingUid(null), 1000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Waiting on {nonVoters.length} member{nonVoters.length === 1 ? "" : "s"}</Text>
      <Text style={styles.sub}>Nudge them to vote so we can lock in a date.</Text>

      {nonVoters.map((u) => {
        const history = nudges[u.uid];
        
        let hasNudgedRecently = false;
        if (history && history.sentAt) {
          const sentAtMs = getMillis(history.sentAt);
          hasNudgedRecently = Date.now() - sentAtMs < 24 * 60 * 60 * 1000;
        }

        return (
          <View key={u.uid} style={styles.row}>
            {u.photoUrl ? (
              <Image source={{ uri: u.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(u.name ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.nameCol}>
              <Text style={styles.name}>{u.name ?? "Unknown"}</Text>
              {history && (
                <Text style={styles.historyText}>
                  Nudged {timeAgo(history.sentAt)}
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.nudgeBtn,
                hasNudgedRecently && styles.nudgeBtnDisabled,
              ]}
              disabled={hasNudgedRecently || nudgingUid === u.uid}
              onPress={() => handleNudge(u.uid)}
            >
              {nudgingUid === u.uid ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.nudgeBtnText,
                    hasNudgedRecently && styles.nudgeBtnTextDisabled,
                  ]}
                >
                  {hasNudgedRecently ? "Nudged" : "Nudge"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}