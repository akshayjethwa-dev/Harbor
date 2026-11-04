// src/components/common/IntentReevaluationModal.tsx
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export default function IntentReevaluationModal({
  visible,
  onAccept,
  onDismiss,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            You've been hosting a lot! 🎉
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Want to see host tools by default? We noticed you've created multiple
            plans recently.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={onAccept}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
              Switch to Host Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss}>
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  message: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});