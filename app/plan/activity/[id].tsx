// app/plan/activity/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Plan } from "../../../src/types/plan";
import { PlanActivity } from "../../../src/types/activity";
import { subscribeToActivityFeed } from "../../../src/services/activityService";
import { useAuth } from "../../../src/context/AuthContext";
import ActivityItem from "../../../src/components/plan/ActivityItem";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

export default function PlanActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [activities, setActivities] = useState<PlanActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination state
  const [limitCount, setLimitCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  // Load Plan
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) setPlan({ id: snap.id, ...snap.data() } as Plan);
    });
    return () => unsub();
  }, [id]);

  // Load Feed
  useEffect(() => {
    if (!id) return;
    
    const unsub = subscribeToActivityFeed(id, limitCount, (data) => {
      // Filter private activities if user is not a member
      const isMember = plan?.participants?.includes(user?.uid || "");
      const filtered = data.filter(a => !a.isPrivate || isMember);
      
      setActivities(filtered);
      setLoading(false);
      setRefreshing(false);
      
      // If we got fewer than the limit, we've reached the end
      setHasMore(data.length === limitCount);
    });

    return () => unsub();
  }, [id, limitCount, plan?.participants, user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    // By resetting limit to 20, the useEffect will trigger a fresh snapshot
    setLimitCount(20); 
    setTimeout(() => setRefreshing(false), 1000); // Fallback
  };

  const loadMore = () => {
    if (hasMore && !loading && !refreshing) {
      setLimitCount(prev => prev + 20);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityItem 
              activity={item} 
              // If the actor is no longer in the plan, mark as former member
              isFormerMember={!plan?.participants?.includes(item.actorUid)} 
            />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && activities.length > 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🌵</Text>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>
                When members log expenses, complete tasks, or change the date, it will show up here.
              </Text>
            </View>
          }
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
  });