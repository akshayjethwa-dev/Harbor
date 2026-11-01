// src/components/discover/WhyThisSheet.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  visible: boolean;
  signals: string[];
  onClose: () => void;
}

export default function WhyThisSheet({ visible, signals, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Why this?</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {signals.map((signal, idx) => (
              <View key={idx} style={styles.signalRow}>
                <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.signalText, { color: colors.text }]}>{signal}</Text>
              </View>
            ))}
            {signals.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                We couldn't find specific signals for this recommendation.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800" },
  content: { paddingHorizontal: 24 },
  signalRow: { flexDirection: "row", marginBottom: 12 },
  bullet: { fontSize: 18, marginRight: 8, lineHeight: 24 },
  signalText: { fontSize: 15, lineHeight: 24, flex: 1 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
});