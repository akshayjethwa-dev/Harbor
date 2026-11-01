// src/components/partner/MatchModal.tsx
import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { announce } from "../../lib/a11y";

interface Props {
  visible: boolean;
  myPhoto: string | null;
  otherPhoto: string | null;
  otherName: string;
  superLike: boolean;
  onClose: () => void;
  onSayHi: () => void;
}

export default function MatchModal({
  visible,
  myPhoto,
  otherPhoto,
  otherName,
  superLike,
  onClose,
  onSayHi,
}: Props) {
  // Screen-reader announcement when the modal opens
  useEffect(() => {
    if (visible) {
      // Delay slightly so the modal is fully mounted before the screen reader interrupts
      const timer = setTimeout(() => {
        announce(`It’s a match with ${otherName}. Say hi to get started.`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, otherName]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{superLike ? "⭐" : "🎉"}</Text>
          <Text style={styles.title}>
            {superLike ? "Super Like Match!" : "It's a match!"}
          </Text>
          <Text style={styles.subtitle}>
            You and {otherName} both swiped right.
          </Text>

          <View style={styles.avatars}>
            {myPhoto ? (
              <Image source={{ uri: myPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>You</Text>
              </View>
            )}
            <Text style={styles.heart}>❤️</Text>
            {otherPhoto ? (
              <Image source={{ uri: otherPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {otherName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onSayHi}>
            <Text style={styles.primaryText}>Say Hi 👋</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryText}>Keep swiping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#E91E63",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarFallback: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 24, fontWeight: "700", color: "#999" },
  heart: { fontSize: 28, marginHorizontal: 12 },
  primaryBtn: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#E91E63",
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 10 },
  secondaryText: { color: "#999", fontSize: 14, fontWeight: "600" },
});