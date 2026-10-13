import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  getPartnerCandidates,
  recordSwipe,
} from "../../src/services/partnerService";
import { usePartnerFiltersStore } from "../../src/store/partnerFiltersStore";
import { PartnerCandidate } from "../../src/types/partner";
import PartnerCard from "../../src/components/partner/PartnerCard";
import MatchModal from "../../src/components/partner/MatchModal";
import FiltersSheet from "../../src/components/partner/FiltersSheet";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

// ─────────────────────────────────────────────────────────
// Styles factory — recomputed on theme change
// ─────────────────────────────────────────────────────────
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    title: { fontSize: 26, fontWeight: "800", color: c.text },
    filterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
      backgroundColor: c.bgElevated,
    },
    filterBtnText: { fontSize: 13, color: c.text, fontWeight: "700" },
    deckWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
    actionRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 24,
      paddingVertical: 24,
    },
    actionBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    passBtn: {
      backgroundColor: c.bg,
      borderWidth: 2,
      borderColor: c.borderStrong,
    },
    superBtn: { backgroundColor: c.info + "22" },
    likeBtn: {
      backgroundColor: c.primarySubtle,
      borderWidth: 2,
      borderColor: c.primary + "55",
    },
    passIcon: { fontSize: 26, color: c.textMuted, fontWeight: "700" },
    superIcon: { fontSize: 26 },
    likeIcon: { fontSize: 26 },
    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    emptyBtn: {
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: c.primary,
      borderRadius: 12,
    },
    emptyBtnText: {
      color: c.textInverse,
      fontWeight: "700",
      fontSize: 15,
    },
    disabledState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    disabledEmoji: { fontSize: 64, marginBottom: 16 },
    disabledTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      marginBottom: 8,
    },
    disabledText: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    disabledBtn: {
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: c.primary,
      borderRadius: 12,
    },
    disabledBtnText: {
      color: c.textInverse,
      fontWeight: "700",
      fontSize: 15,
    },
  });

export default function PartnersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { filters } = usePartnerFiltersStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [candidates, setCandidates] = useState<PartnerCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    matchId: string;
    otherName: string;
    otherPhotoUrl: string | null;
    superLike: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getPartnerCandidates(user, filters);
      setCandidates(list);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const current = candidates[0] ?? null;

  const handleSwipe = async (direction: "left" | "right" | "super") => {
    if (!current || !user) return;
    const target = current;
    setCandidates((prev) => prev.slice(1));

    try {
      const result = await recordSwipe(user, target.uid, direction);
      if (result.matched && result.matchId) {
        setMatchResult({
          matchId: result.matchId,
          otherName: target.name,
          otherPhotoUrl: target.photoUrl,
          superLike: direction === "super",
        });
      }
    } catch (e: any) {
      console.warn(e);
      Alert.alert("Error", e.message);
    }
  };

  // ─── Partner mode is disabled ───
  if (!user?.lookingForPartner) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.disabledState}>
          <Text style={styles.disabledEmoji}>💫</Text>
          <Text style={styles.disabledTitle}>Partner mode is off</Text>
          <Text style={styles.disabledText}>
            Turn it on from your Profile to start discovering people 1-on-1.
          </Text>
          <TouchableOpacity
            style={styles.disabledBtn}
            onPress={() => router.push("/(tabs)/profile" as any)}
          >
            <Text style={styles.disabledBtnText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Partners</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterBtnText}>⚙️ Filters</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !current ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No more candidates</Text>
          <Text style={styles.emptyText}>
            Try expanding your filters or check back later.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.emptyBtnText}>Adjust Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.deckWrap}>
            <PartnerCard candidate={current} />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.passBtn]}
              onPress={() => handleSwipe("left")}
            >
              <Text style={styles.passIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.superBtn]}
              onPress={() => handleSwipe("super")}
            >
              <Text style={styles.superIcon}>⭐</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.likeBtn]}
              onPress={() => handleSwipe("right")}
            >
              <Text style={styles.likeIcon}>❤️</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <MatchModal
        visible={!!matchResult}
        myPhoto={user.photoUrl ?? null}
        otherPhoto={matchResult?.otherPhotoUrl ?? null}
        otherName={matchResult?.otherName ?? ""}
        superLike={matchResult?.superLike ?? false}
        onClose={() => setMatchResult(null)}
        onSayHi={() => {
          const id = matchResult?.matchId;
          setMatchResult(null);
          if (id) {
            router.push({
              pathname: "/partner/chat/[id]" as any,
              params: { id },
            });
          }
        }}
      />

      <FiltersSheet
        visible={showFilters}
        onClose={() => {
          setShowFilters(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}