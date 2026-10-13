import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";

interface Props {
  visible: boolean;
  url: string;
  label: string;
  onClose: () => void;
}

export default function QRCodeModal({ visible, url, label, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Scan to join</Text>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.qrWrap}>
            <QRCode value={url} size={220} backgroundColor="#FFF" />
          </View>
          <Text style={styles.url} numberOfLines={1}>{url}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    maxWidth: 360,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", marginBottom: 4 },
  label: { fontSize: 14, color: "#666", marginBottom: 24, textAlign: "center" },
  qrWrap: { padding: 16, backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#EEE" },
  url: { fontSize: 12, color: "#999", marginTop: 16, maxWidth: "100%" },
  closeBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#E91E63", borderRadius: 12 },
  closeText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});