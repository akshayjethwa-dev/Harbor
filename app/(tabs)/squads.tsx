import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { getMySquads } from "../../src/services/squadService";
import { Squad } from "../../src/types/squad";
import { getActivityMeta } from "../../src/constants/activities";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
    title: { fontSize: 26, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 14, color: c.textSecondary, marginTop: 4 },
    list: { paddingHorizontal: 24, paddingBottom: 80 },
    empty: {
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
    card: {
      flexDirection: "row",
      backgroundColor: c.bgElevated,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardBanner: { width: 92, justifyContent: "center", alignItems: "center" },
    cardCover: { width: 92, height: "100%" },
    cardEmoji: { fontSize: 40 },
    cardBody: { flex: 1, padding: 14 },
    cardTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    cardMeta: { fontSize: 12, color: c.textSecondary, marginTop: 3 },
    adminBadge: {
      marginTop: 6,
      alignSelf: "flex-start",
      backgroundColor: c.primarySubtle,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    adminText: { fontSize: 11, color: c.primary, fontWeight: "700" },
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
    fabText: {
      color: c.textInverse,
      fontSize: 32,
      fontWeight: "300",
      lineHeight: 34,
    },
  });

export default function SquadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const list = await getMySquads(user.uid);
      setSquads(list);
    } catch (e: any) {
      setError(e.message ?? "Could not load Squads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [user, load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Squads</Text>
        <Text style={styles.subtitle}>Persistent crews that play together</Text>
      </View>

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Couldn't load Squads</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : squads.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>No Squads yet</Text>
          <Text style={styles.emptyText}>
            Form a Squad with your regular crew so you always have a home.
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/squad/create" as any)}
          >
            <Text style={styles.createText}>+ Create Squad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={squads}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const act = getActivityMeta(item.activity);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/squad/[id]",
                    params: { id: item.id },
                  })
                }
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.cardBanner,
                    { backgroundColor: act.color + "22" },
                  ]}
                >
                  {item.coverImageUrl ? (
                    <Image
                      source={{ uri: item.coverImageUrl }}
                      style={styles.cardCover}
                    />
                  ) : (
                    <Text style={styles.cardEmoji}>{act.emoji}</Text>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {act.label} · {item.city}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.memberUids.length} member
                    {item.memberUids.length === 1 ? "" : "s"}
                    {item.recurring?.enabled
                      ? ` · Recurring ${
                          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                            item.recurring.dayOfWeek ?? 0
                          ]
                        }`
                      : ""}
                  </Text>
                  {item.adminUid === user?.uid && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminText}>You're admin</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {squads.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/squad/create" as any)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}