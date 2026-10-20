// app/plan/album/[id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Plan } from "../../../src/types/plan";
import { PlanPhoto } from "../../../src/types/photo";
import { subscribeToPhotos, uploadPlanPhoto } from "../../../src/services/photoService";
import { useAuth } from "../../../src/context/AuthContext";
import PhotoViewerModal from "../../../src/components/plan/PhotoViewerModal";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

const MAX_PHOTOS = 500;
const WARNING_LIMIT = 480;

export default function PlanAlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [photos, setPhotos] = useState<PlanPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PlanPhoto | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) setPlan({ id: snap.id, ...snap.data() } as Plan);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToPhotos(id, (data) => {
      setPhotos(data);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const isParticipant = plan?.participants?.includes(user?.uid || "") || false;

  const handlePickImage = async () => {
    if (photos.length >= MAX_PHOTOS) {
      return Alert.alert("Album Full", `This plan has reached the limit of ${MAX_PHOTOS} photos.`);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1, // We compress manually in the service
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    
    // Duplicate check (same file name & size within last 5 mins)
    const recentDupes = photos.filter(p => 
      p.uploaderUid === user?.uid && 
      p.fileName === asset.uri.split("/").pop() &&
      Date.now() - (p.createdAt?.toMillis?.() || 0) < 5 * 60 * 1000
    );
    if (recentDupes.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert("Duplicate Photo", "You recently uploaded this. Upload again?", [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Upload anyway", onPress: () => resolve(true) }
        ]);
      });
      if (!proceed) return;
    }

    setUploading(true);
    try {
      await uploadPlanPhoto(id || "", user!, asset.uri, asset.uri.split("/").pop() || "photo.jpg");
    } catch (e: any) {
      Alert.alert("Upload Failed", "Could not upload photo. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Album</Text>
        <View style={{ width: 40 }} />
      </View>

      {photos.length >= WARNING_LIMIT && photos.length < MAX_PHOTOS && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Album is nearing its limit ({photos.length}/{MAX_PHOTOS}).</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ padding: 4, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.photoWrapper} onPress={() => setActivePhoto(item)}>
              <Image source={{ uri: item.url }} style={styles.photo} />
              {item.isReported && (
                <View style={styles.reportedBadge}><Text style={styles.reportedText}>!</Text></View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📸</Text>
              <Text style={styles.emptyTitle}>No photos yet</Text>
              <Text style={styles.emptyText}>Share your memories from this plan!</Text>
            </View>
          }
        />
      )}

      {isParticipant && (
        <TouchableOpacity style={styles.fab} onPress={handlePickImage} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.fabText}>+ Add Photo</Text>}
        </TouchableOpacity>
      )}

      <PhotoViewerModal
        visible={!!activePhoto}
        onClose={() => setActivePhoto(null)}
        photo={activePhoto}
      />
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
    
    warningBanner: { backgroundColor: c.warning + "22", padding: 12, alignItems: "center" },
    warningText: { color: c.warning, fontSize: 13, fontWeight: "700" },

    photoWrapper: { flex: 1/3, aspectRatio: 1, padding: 2 },
    photo: { width: "100%", height: "100%", borderRadius: 4, backgroundColor: c.bgSubtle },
    
    reportedBadge: {
      position: "absolute", top: 6, right: 6, backgroundColor: c.danger,
      width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    reportedText: { color: "#FFF", fontSize: 12, fontWeight: "900" },

    emptyBox: { alignItems: "center", marginTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: c.textSecondary },

    fab: {
      position: "absolute", bottom: 24, right: 24, backgroundColor: c.primary,
      paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
    },
    fabText: { color: c.textInverse, fontWeight: "800", fontSize: 15 },
  });