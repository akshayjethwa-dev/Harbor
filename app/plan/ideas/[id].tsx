// app/plan/ideas/[id].tsx
import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Plan } from "../../../src/types/plan";
import { PlanIdea } from "../../../src/types/idea";
import { GarbaCrewUser } from "../../../src/types/user";
import { subscribeToIdeas } from "../../../src/services/ideaService";
import { getUserProfile } from "../../../src/services/userService";
import { useAuth } from "../../../src/context/AuthContext";
import IdeaCard from "../../../src/components/plan/IdeaCard";
import ProposeIdeaModal from "../../../src/components/plan/ProposeIdeaModal";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

export default function PlanIdeasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [ideas, setIdeas] = useState<PlanIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [organizerUser, setOrganizerUser] = useState<GarbaCrewUser | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Plan;
        setPlan(p);
        if (p.hostUid) getUserProfile(p.hostUid).then(setOrganizerUser);
      }
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToIdeas(id, (data) => {
      setIdeas(data);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const isParticipant = plan?.participants?.includes(user?.uid || "") || false;
  const isOrganizer = user?.uid === plan?.hostUid;
  const isDateConfirmed = plan?.dateStatus === "confirmed";

  // Calculate leading ideas
  const leadingIdeas = useMemo(() => {
    if (ideas.length === 0) return [];
    
    // Find max score
    let maxScore = -Infinity;
    ideas.forEach(idea => {
      const score = (idea.upvotes?.length || 0) - (idea.downvotes?.length || 0);
      if (score > maxScore) maxScore = score;
    });

    // If max score is <= 0, no one is leading
    if (maxScore <= 0) return [];

    // Return all ideas tied for max score
    return ideas
      .filter(idea => ((idea.upvotes?.length || 0) - (idea.downvotes?.length || 0)) === maxScore)
      .map(idea => idea.id);
  }, [ideas]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ideas</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={ideas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IdeaCard 
              idea={item} 
              planId={id || ""} 
              isLeading={leadingIdeas.includes(item.id)}
              isOrganizer={isOrganizer}
              organizerUser={organizerUser}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={styles.emptyTitle}>No ideas yet</Text>
              <Text style={styles.emptyText}>
                Propose a restaurant, venue, or activity and let the group vote!
              </Text>
            </View>
          }
        />
      )}

      {isParticipant && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Text style={styles.fabText}>+ Propose Idea</Text>
        </TouchableOpacity>
      )}

      {plan && (
        <ProposeIdeaModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          planId={plan.id}
          existingIdeas={ideas}
          isDateConfirmed={isDateConfirmed}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    backIcon: { fontSize: 22, color: c.text },
    headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    
    emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center", lineHeight: 20 },

    fab: {
      position: "absolute", bottom: 24, right: 24, backgroundColor: c.primary,
      paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
    },
    fabText: { color: c.textInverse, fontWeight: "800", fontSize: 15 },
  });