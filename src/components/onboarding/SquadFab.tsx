// src/components/onboarding/SquadFab.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

type Props = { onPress: () => void };

export default function SquadFab({ onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.fab,
        {
          backgroundColor: colors.primary,
          bottom: Platform.OS === 'ios' ? 100 : 88, // clears the tab bar
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Create squad"
    >
      <Ionicons name="add" size={18} color="#fff" />
      <Text style={styles.label}>Squad</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  label: { color: '#fff', fontSize: 13, fontWeight: '700' },
});