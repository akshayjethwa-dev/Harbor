// app/offline.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getAllOfflineItineraries, OfflineItineraryData, deleteOfflineItinerary } from "../src/services/offlineService";
import { useTheme } from "../src/theme/ThemeContext";
import { useThemedStyles } from "../src/hooks/useThemedStyles";
import { ThemeColors } from "../src/theme/colors";

export default function OfflineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [itineraries, setItineraries] = useState<OfflineItineraryData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getAllOfflineItineraries().then((data) => {
      // Sort by most recently downloaded
      data.sort((a, b) => b.downloadedAt - a.downloadedAt);
      setItineraries(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (planId: string) => {
    Alert.alert("Remove Download", "Delete this itinerary from your device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteOfflineItinerary(planId);
          loadData();
        } 
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Itineraries</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={itineraries}
          keyExtractor={(item) => item.planId}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.planTitle}</Text>
                <Text style={styles.cardSub}>
                  {item.items.length} stops • Downloaded {new Date(item.downloadedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewBtn}
                onPress={() => router.push(`/plan/itinerary/${item.planId}` as any)}
              >
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.planId)} style={{ padding: 8, marginLeft: 8 }}>
                <Text style={{ color: colors.danger, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Offline Itineraries</Text>
              <Text style={styles.emptyText}>Download a plan's itinerary to access it without internet.</Text>
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
    
    card: {
      flexDirection: "row", alignItems: "center", backgroundColor: c.bgElevated,
      padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: c.border,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    viewBtn: { backgroundColor: c.primary + "11", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    viewBtnText: { color: c.primary, fontWeight: "700", fontSize: 13 },

    emptyBox: { alignItems: "center", marginTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
  });