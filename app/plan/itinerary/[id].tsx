// app/plan/itinerary/[id].tsx
import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import NetInfo from "@react-native-community/netinfo"; // <-- Added
import { Plan } from "../../../src/types/plan";
import { ItineraryItem } from "../../../src/types/itinerary";
import { subscribeToItinerary, updateItineraryItem, removeFromItinerary, reorderItineraryItems } from "../../../src/services/itineraryService";
import { optimizeRoute } from "../../../src/services/routeService";
import { downloadItineraryOffline, getOfflineItinerary, isOfflineExpired } from "../../../src/services/offlineService"; // <-- Added
import { useAuth } from "../../../src/context/AuthContext";
import ItineraryItemCard from "../../../src/components/plan/ItineraryItemCard";
import EditItineraryModal from "../../../src/components/plan/EditItineraryModal";
import RouteMap from "../../../src/components/plan/RouteMap";
import OptimizeConfirmModal from "../../../src/components/plan/OptimizeConfirmModal";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

export default function PlanItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  const [activeDay, setActiveDay] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [optimizedPreview, setOptimizedPreview] = useState<ItineraryItem[] | null>(null);

  // Offline state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadExpired, setDownloadExpired] = useState(false);

  // 1. Network Listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Plan
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) setPlan({ id: snap.id, ...snap.data() } as Plan);
    });
    return () => unsub();
  }, [id]);

  // 3. Load Items (Live or Offline)
  useEffect(() => {
    if (!id) return;

    if (!isOnline) {
      // Load from offline cache if disconnected
      getOfflineItinerary(id).then((data) => {
        if (data) {
          setItems(data.items);
          setIsDownloaded(true);
          setDownloadExpired(isOfflineExpired(data.downloadedAt));
        } else {
          Alert.alert("Offline", "You are offline and this itinerary has not been downloaded.");
        }
        setLoading(false);
      });
      return;
    }

    // Standard live subscription
    const unsub = subscribeToItinerary(id, (data) => {
      setItems(data);
      setLoading(false);
      
      // Check if downloaded version is stale
      getOfflineItinerary(id).then((offline) => {
        if (offline) {
          setIsDownloaded(true);
          setDownloadExpired(isOfflineExpired(offline.downloadedAt));
        }
      });
    });
    return () => unsub();
  }, [id, isOnline]);

  // Handle Download Action
  const handleDownload = async () => {
    if (!id || !plan || items.length === 0) return;
    setIsDownloading(true);
    try {
      // Use the latest updatedAt time from items
      const latestMs = Math.max(...items.map(i => i.addedAt?.toMillis?.() || Date.now()));
      await downloadItineraryOffline(id, plan.title, items, latestMs);
      setIsDownloaded(true);
      setDownloadExpired(false);
      Alert.alert("Success", "Itinerary and maps saved for offline use.");
    } catch (e: any) {
      Alert.alert("Download Failed", e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveItem = async (updates: Partial<ItineraryItem>) => {
    if (!editingItem || !id) return;
    await updateItineraryItem(id, editingItem.id, updates);
  };

  const handleRemove = (itemId: string) => {
    Alert.alert("Remove Item", "Remove this from the itinerary?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeFromItinerary(id || "", itemId) }
    ]);
  };

  const handleDragEnd = ({ data }: { data: ItineraryItem[] }) => {
    reorderItineraryItems(id || "", data);
  };

  const handleOptimize = () => {
    if (items.length <= 1) return Alert.alert("Not enough stops", "Add at least 2 stops with locations.");
    const itemsWithCoords = items.filter(i => i.latitude != null && i.longitude != null);
    if (itemsWithCoords.length < 2) return Alert.alert("Missing locations", "At least 2 items need a location.");

    try {
      const optimized = optimizeRoute(items);
      setOptimizedPreview(optimized);
    } catch (e) {
      Alert.alert("Optimization Failed", "Original order preserved.");
    }
  };

  const confirmOptimize = async () => {
    if (!optimizedPreview || !id) return;
    try {
      await reorderItineraryItems(id, optimizedPreview);
      setOptimizedPreview(null);
    } catch (e) {
      Alert.alert("Error", "Failed to apply route.");
    }
  };

  // Calculate total days
  const totalDays = useMemo(() => {
    if (!plan?.startTime || !plan?.endTime) return 1;
    const start = plan.startTime.toDate();
    const end = plan.endTime.toDate();
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [plan]);

  const unplanned = items.filter(i => i.dayIndex === null);
  const dayItems = items.filter(i => i.dayIndex === activeDay);

  const isOrganizer = user?.uid === plan?.hostUid;

  const renderDayItem = ({ item, drag, isActive }: RenderItemParams<ItineraryItem>) => (
    <ItineraryItemCard
      item={item}
      isActive={isActive}
      onLongPress={isOrganizer && isOnline ? drag : undefined}
      onPress={() => { setEditingItem(item); setShowEditModal(true); }}
      onRemove={isOrganizer && isOnline ? () => handleRemove(item.id) : undefined}
      showRemove={isOrganizer && isOnline}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Itinerary</Text>
        
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Offline Download Button */}
          <TouchableOpacity 
            style={[styles.downloadBtn, isDownloaded && { backgroundColor: colors.success + "22", borderColor: colors.success }]} 
            onPress={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Text style={[styles.downloadText, isDownloaded && { color: colors.success }]}>
                {isDownloaded ? "✓ Saved" : "⬇️ Save"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleBtn} 
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Text style={styles.toggleIcon}>{viewMode === "list" ? "🗺️" : "📋"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Notices */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📶 You are offline. Showing cached itinerary.</Text>
        </View>
      )}
      {downloadExpired && isDownloaded && (
        <TouchableOpacity style={styles.expiredBanner} onPress={handleDownload}>
          <Text style={styles.expiredText}>⚠️ Offline data is over 30 days old. Tap to refresh.</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : viewMode === "map" ? (
        <RouteMap 
          items={items} 
          onSelectItem={(item) => { setEditingItem(item); setShowEditModal(true); }} 
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Unplanned Pool */}
          {unplanned.length > 0 && (
            <View style={styles.poolContainer}>
              <Text style={styles.poolTitle}>Unplanned ({unplanned.length})</Text>
              <DraggableFlatList
                horizontal
                data={unplanned}
                keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.poolCard}
                    onPress={() => { setEditingItem(item); setShowEditModal(true); }}
                  >
                    <Text style={styles.poolCardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.poolCardSub}>Tap to schedule</Text>
                  </TouchableOpacity>
                )}
                onDragEnd={() => {}}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
              />
            </View>
          )}

          {/* Day Tabs */}
          <View style={styles.tabBar}>
            <DraggableFlatList
              horizontal
              data={Array.from({ length: totalDays }).map((_, i) => ({ id: i.toString(), day: i }))}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.dayTab, activeDay === item.day && styles.dayTabActive]}
                  onPress={() => setActiveDay(item.day)}
                >
                  <Text style={[styles.dayTabText, activeDay === item.day && styles.dayTabTextActive]}>Day {item.day + 1}</Text>
                </TouchableOpacity>
              )}
              onDragEnd={() => {}}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            />
          </View>

          {/* Timeline */}
          {dayItems.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyIcon}>🏖️</Text>
              <Text style={styles.emptyTitle}>Free Day</Text>
              <Text style={styles.emptyText}>No activities planned for this day yet.</Text>
            </View>
          ) : (
            <DraggableFlatList
              data={dayItems}
              keyExtractor={(item) => item.id}
              renderItem={renderDayItem}
              onDragEnd={handleDragEnd}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
          )}
        </View>
      )}

      {/* Modals */}
      {plan && editingItem && (
        <EditItineraryModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveItem}
          item={editingItem}
          plan={plan}
          existingItems={items}
        />
      )}

      {optimizedPreview && (
        <OptimizeConfirmModal
          visible={!!optimizedPreview}
          onClose={() => setOptimizedPreview(null)}
          originalItems={dayItems}
          optimizedItems={optimizedPreview}
          onConfirm={confirmOptimize}
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
    
    downloadBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: c.bgSubtle, borderWidth: 1, borderColor: c.border },
    downloadText: { fontSize: 13, fontWeight: "700", color: c.primary },
    
    toggleBtn: { padding: 8, backgroundColor: c.bgSubtle, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    toggleIcon: { fontSize: 18 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    offlineBanner: { backgroundColor: c.textMuted, padding: 8, alignItems: "center" },
    offlineText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
    expiredBanner: { backgroundColor: c.warning + "22", padding: 12, alignItems: "center" },
    expiredText: { color: c.warning, fontSize: 12, fontWeight: "700" },

    poolContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.bgSubtle },
    poolTitle: { fontSize: 12, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 16 },
    poolCard: { backgroundColor: c.bgElevated, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: c.border, width: 160 },
    poolCardTitle: { fontSize: 14, fontWeight: "700", color: c.text },
    poolCardSub: { fontSize: 11, color: c.primary, marginTop: 4 },

    tabBar: { paddingVertical: 12 },
    dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: c.bgSubtle, borderWidth: 1, borderColor: c.border },
    dayTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    dayTabText: { fontSize: 14, fontWeight: "700", color: c.textSecondary },
    dayTabTextActive: { color: c.textInverse },

    emptyDay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: "center" },
  });