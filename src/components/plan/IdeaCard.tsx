// src/components/plan/IdeaCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from "react-native";
import { PlanIdea } from "../../types/idea";
import { GarbaCrewUser } from "../../types/user";
import { voteIdea, reportIdea } from "../../services/ideaService";
import { addIdeaToItinerary } from "../../services/itineraryService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  idea: PlanIdea;
  planId: string;
  isLeading?: boolean;
  isOrganizer?: boolean;
  organizerUser?: GarbaCrewUser | null;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.bgElevated, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: c.border,
  },
  cardLeading: {
    borderColor: c.success, backgroundColor: c.success + "05",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center", marginRight: 8 },
  avatarInitial: { fontSize: 12, fontWeight: "700", color: c.textMuted },
  proposer: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
  
  leadingBadge: {
    backgroundColor: c.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  leadingText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

  title: { fontSize: 16, fontWeight: "800", color: c.text, marginBottom: 4 },
  desc: { fontSize: 14, color: c.textSecondary, marginBottom: 12, lineHeight: 20 },
  
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: c.bgSubtle, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: c.border },
  badgeText: { fontSize: 12, fontWeight: "600", color: c.primary },
  postDecisionBadge: { backgroundColor: c.warning + "22", borderColor: c.warning },
  postDecisionText: { color: c.warning },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginTop: 4 },
  voteRow: { flexDirection: "row", gap: 10 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgSubtle },
  voteBtnActiveUp: { borderColor: c.success, backgroundColor: c.success + "11" },
  voteBtnActiveDown: { borderColor: c.danger, backgroundColor: c.danger + "11" },
  voteText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
  voteTextActiveUp: { color: c.success },
  voteTextActiveDown: { color: c.danger },
  
  actionRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  addBtn: { backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: c.textInverse, fontSize: 12, fontWeight: "700" },
  reportBtn: { padding: 4 },
  reportText: { fontSize: 11, color: c.textMuted, textDecorationLine: "underline" },
});

export default function IdeaCard({ idea, planId, isLeading = false, isOrganizer = false, organizerUser }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const upCount = idea.upvotes?.length || 0;
  const downCount = idea.downvotes?.length || 0;
  const hasUpvoted = idea.upvotes?.includes(user?.uid || "");
  const hasDownvoted = idea.downvotes?.includes(user?.uid || "");

  const handleVote = async (type: "up" | "down") => {
    if (!user?.uid) return;
    try {
      await voteIdea(planId, idea.id, user.uid, type);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleAddToItinerary = () => {
    if (!organizerUser) return;
    
    const totalVotes = upCount + downCount;
    const isMajorityNo = totalVotes > 0 && downCount > totalVotes / 2;

    const performAdd = async () => {
      try {
        // Pass Date.now() as the currentMaxOrder to satisfy the 4th argument
        await addIdeaToItinerary(planId, idea, organizerUser, Date.now());
        Alert.alert("Success", "Added to itinerary!");
      } catch (e: any) {
        Alert.alert("Error", e.message);
      }
    };

    if (isMajorityNo) {
      Alert.alert(
        "Warning: Majority Disapproval",
        "This idea has more downvotes than upvotes. Are you sure you want to add it to the itinerary?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add anyway", style: "destructive", onPress: performAdd }
        ]
      );
    } else {
      performAdd();
    }
  };

  const handleLink = () => {
    if (idea.link) Linking.openURL(idea.link).catch(() => Alert.alert("Invalid URL"));
  };

  const handleLocation = () => {
    if (idea.location) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(idea.location)}`;
      Linking.openURL(url).catch(() => Alert.alert("Could not open maps"));
    }
  };

  const handleReport = () => {
    Alert.alert("Report Idea", "Report this idea as inappropriate?", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: () => reportIdea(planId, idea.id) }
    ]);
  };

  return (
    <View style={[styles.card, isLeading && styles.cardLeading]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {idea.proposerPhotoUrl ? (
            <Image source={{ uri: idea.proposerPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{idea.proposerName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.proposer}>{idea.proposerName} proposed</Text>
        </View>
        
        {isLeading && (
          <View style={styles.leadingBadge}>
            <Text style={styles.leadingText}>🥇 LEADING</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{idea.title}</Text>
      {idea.description ? <Text style={styles.desc}>{idea.description}</Text> : null}

      <View style={styles.badgeRow}>
        {idea.estimatedCost != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>₹{idea.estimatedCost}</Text>
          </View>
        )}
        {idea.link && (
          <TouchableOpacity style={styles.badge} onPress={handleLink}>
            <Text style={styles.badgeText}>🔗 Link</Text>
          </TouchableOpacity>
        )}
        {idea.location && (
          <TouchableOpacity style={styles.badge} onPress={handleLocation}>
            <Text style={styles.badgeText}>📍 Map</Text>
          </TouchableOpacity>
        )}
        {idea.isPostDecision && (
          <View style={[styles.badge, styles.postDecisionBadge]}>
            <Text style={[styles.badgeText, styles.postDecisionText]}>POST-DECISION</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.voteRow}>
          <TouchableOpacity 
            style={[styles.voteBtn, hasUpvoted && styles.voteBtnActiveUp]} 
            onPress={() => handleVote("up")}
          >
            <Text style={[styles.voteText, hasUpvoted && styles.voteTextActiveUp]}>👍 {upCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.voteBtn, hasDownvoted && styles.voteBtnActiveDown]} 
            onPress={() => handleVote("down")}
          >
            <Text style={[styles.voteText, hasDownvoted && styles.voteTextActiveDown]}>👎 {downCount}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          {isOrganizer && (
            <TouchableOpacity style={styles.addBtn} onPress={handleAddToItinerary}>
              <Text style={styles.addBtnText}>+ Itinerary</Text>
            </TouchableOpacity>
          )}
          
          {!idea.isReported && idea.proposerUid !== user?.uid && (
            <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
              <Text style={styles.reportText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}