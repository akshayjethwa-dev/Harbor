// src/components/plan/ResumeDraftModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ResumeDraftModalProps {
  visible: boolean;
  step: number;
  onResume: () => void;
  onStartFresh: () => void;
}

export default function ResumeDraftModal({
  visible,
  step,
  onResume,
  onStartFresh,
}: ResumeDraftModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={() => {}}>
        <Pressable style={[styles.container, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Unfinished Plan Found
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You left off at Step {step} of 8. Would you like to pick up where you left off?
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={onResume}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
              Resume draft (Step {step} of 8)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={onStartFresh}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              Start Fresh
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});