// src/components/plan/CreatePlanActionSheet.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeColors } from '../../theme/colors';

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    option: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    optionTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    optionSub: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    cancel: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: c.bgSubtle,
    },
    cancelText: { fontSize: 16, fontWeight: '700', color: c.textSecondary },
  });

interface Props {
  visible: boolean;
  onClose: () => void;
  onQuick: () => void;
  onAdvanced: () => void;
}

export default function CreatePlanActionSheet({
  visible,
  onClose,
  onQuick,
  onAdvanced,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Create a Plan</Text>

          <TouchableOpacity style={styles.option} onPress={onQuick}>
            <Text style={styles.optionTitle}>Quick Plan</Text>
            <Text style={styles.optionSub}>
              Four fields, fast publish. Perfect for testing the waters.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onAdvanced}>
            <Text style={styles.optionTitle}>Advanced Plan</Text>
            <Text style={styles.optionSub}>
              Full 8‑step wizard with requirements, approval, and visibility.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}