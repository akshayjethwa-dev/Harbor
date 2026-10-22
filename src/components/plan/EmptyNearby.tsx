// src/components/plan/EmptyNearby.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  city?: string;
  onCreatePlan: () => void;
};

export default function EmptyNearby({
  city = 'your city',
  onCreatePlan,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name="location-outline" size={28} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        No plans in {city} yet.
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Why not start one and be the first to gather people?
      </Text>

      <TouchableOpacity
        onPress={onCreatePlan}
        activeOpacity={0.85}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.ctaText}>Start a plan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});