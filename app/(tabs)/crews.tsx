import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QueryDocumentSnapshot } from "firebase/firestore";
import { useAuth } from "../../src/context/AuthContext";
import { fetchPlans } from "../../src/services/planService";
import { Plan } from "../../src/types/plan";
import PlanCard from "../../src/components/plan/PlanCard";
import FilterChips from "../../src/components/plan/FilterChips";
import NotificationPermissionBanner from "../../src/components/common/NotificationPermissionBanner";
// ─── Task 49: First Plan Prompt ───
import FirstPlanPrompt from "../../src/components/onboarding/FirstPlanPrompt";

import { usePlanQuota } from "../../src/hooks/usePlanQuota";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 12,
    },
    greeting: { fontSize: 26, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 14, color: c.textSecondary, marginTop: 4 },
    searchBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
    },
    quotaBanner: {
      backgroundColor: isDarkBanner(c),
      paddingHorizontal: 24,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.warning + "33",
    },
    quotaText: { fontSize: 12, color: c.warning, fontWeight: "600" },
    listContent: { paddingHorizontal: 24, paddingBottom: 80 },
    emptyContainer: {
      flex: 1,
      paddingTop: 80,
      paddingHorizontal: 24,
      alignItems: "center",
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
      lineHeight: 20,
    },
    createBtn: {
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: c.primary,
      borderRadius: 12,
    },
    createText: { color: c.textInverse, fontWeight: "700", fontSize: 15 },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    retryText: { color: c.primary, fontWeight: "700" },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabDisabled: { backgroundColor: c.borderStrong },
    fabText: {
      color: c.textInverse,
      fontSize: 32,
      fontWeight: "300",
      lineHeight: 34,
    },
  });

// Helper — pick a background that works in both themes
function isDarkBanner(c: ThemeColors): string {
  return c.bg === "#0F0F0F" ? "#3A2A0F" : "#FFF8E1";
}

export default function CrewsScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { quota } = usePlanQuota();
  const quotaExhausted = quota && !quota.allowed;

  const loadFirst = useCallback(async () => {
    if (!user?.city) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPlans({
        city: user.city,
        activityFilter,
        maxResults: 20,
      });
      setPlans(result.plans);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e: any) {
      console.warn(e);
      setError(e.message ?? "Could not load Plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.city, activityFilter]);

  useEffect(() => {
    if (!authLoading && user) loadFirst();
  }, [authLoading, user, activityFilter, loadFirst]);

  useFocusEffect(
    useCallback(() => {
      if (user) loadFirst();
    }, [user, loadFirst])
  );

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor || !user?.city) return;
    setLoadingMore(true);
    try {
      const result = await fetchPlans({
        city: user.city,
        activityFilter,
        maxResults: 20,
        cursor,
      });
      setPlans((prev) => [...prev, ...result.plans]);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFirst();
  };

  const handleCreatePress = () => {
    if (quotaExhausted && quota) {
      const msg =
        quota.dailyRemaining === 0
          ? `You've reached your daily limit (${quota.dailyLimit} Plans/day). Try again tomorrow.`
          : `You've reached your weekly limit (${quota.weeklyLimit} Plans/week).`;
      if (Platform.OS === "web") {
        // @ts-ignore
        window.alert(msg);
      } else {
        Alert.alert("Rate limit", msg);
      }
      return;
    }
    router.push("/plan/create" as any);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hey {firstName} 👋</Text>
          <Text style={styles.subtitle}>
            {user?.city ? `Plans near ${user.city}` : "Discover Plans and crews"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push("/search" as any)}
          accessibilityRole="button"
          accessibilityLabel="Search Plans, Squads, and People"
        >
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {quota && quota.allowed && quota.dailyRemaining <= 1 && (
        <View style={styles.quotaBanner}>
          <Text style={styles.quotaText}>
            ⚡ You have {quota.dailyRemaining} Plan
            {quota.dailyRemaining === 1 ? "" : "s"} left today
          </Text>
        </View>
      )}

      {/* Task 49: First Plan Prompt */}
      <FirstPlanPrompt />

      <NotificationPermissionBanner />

      <FilterChips selected={activityFilter} onSelect={setActivityFilter} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Couldn't load Plans</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadFirst}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlanCard plan={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>No Plans nearby</Text>
              <Text style={styles.emptyText}>
                Be the first to create one in {user?.city ?? "your city"}!
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreatePress}
              >
                <Text style={styles.createText}>+ Create Plan</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 20 }}
                color={colors.primary}
              />
            ) : null
          }
        />
      )}

      {!loading && plans.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, quotaExhausted && styles.fabDisabled]}
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create a new Plan"
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}