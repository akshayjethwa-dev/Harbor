// src/components/plan/PhotoViewerModal.tsx
import React from "react";
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { PlanPhoto } from "../../types/photo";
import { deletePlanPhoto, reportPlanPhoto } from "../../services/photoService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  photo: PlanPhoto | null;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  closeBtn: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 },
  closeText: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  image: { width: "100%", height: "70%", resizeMode: "contain" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 48, backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  meta: { flex: 1 },
  uploader: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  date: { color: "#AAA", fontSize: 12, marginTop: 4 },
  actionBtn: { padding: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, marginLeft: 12 },
  actionText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  dangerText: { color: "#FF3B30" },
});

export default function PhotoViewerModal({ visible, onClose, photo }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  if (!photo) return null;

  // 24-hour delete window check
  const isMine = user?.uid === photo.uploaderUid;
  const createdMs = photo.createdAt?.toMillis?.() || 0;
  const isWithin24h = Date.now() - createdMs < 24 * 60 * 60 * 1000;
  const canDelete = isMine && isWithin24h;

  const handleDelete = () => {
    Alert.alert("Delete Photo", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deletePlanPhoto(photo);
            onClose();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        } 
      }
    ]);
  };

  const handleReport = () => {
    Alert.alert("Report Photo", "Report this photo as inappropriate?", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: async () => {
          await reportPlanPhoto(photo.planId, photo.id);
          Alert.alert("Reported", "Thank you. The organizers will review this.");
        } 
      }
    ]);
  };

  const dateStr = photo.createdAt?.toDate?.() 
    ? photo.createdAt.toDate().toLocaleDateString() 
    : "";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image source={{ uri: photo.url }} style={styles.image} />

        <View style={styles.footer}>
          <View style={styles.meta}>
            <Text style={styles.uploader}>Uploaded by {photo.uploaderName}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>

          {canDelete && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
            </TouchableOpacity>
          )}

          {!isMine && !photo.isReported && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
              <Text style={styles.actionText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}