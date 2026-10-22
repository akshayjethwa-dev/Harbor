// src/components/plan/PlanCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan } from '../../types/plan';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';

type Props = {
  plan: Plan;
  onPress?: () => void;
};

export default function PlanCard({ plan, onPress }: Props) {
  const { colors } = useTheme();

  // Fallbacks safely check types without throwing TS errors
  const venue = (plan as any).venue || plan.city || 'Location TBD';
  const dateStr = (plan as any).dateString || (plan as any).date || 'Upcoming';
  const attendeesCount = (plan as any).attendeesCount || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bgSubtle }]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {plan.title || 'Untitled Plan'}
          </Text>
          <Text style={[styles.activity, { color: colors.primary }]}>
            {plan.activity?.toUpperCase()}
          </Text>
        </View>
        
        {/* Attendees Pill */}
        {attendeesCount > 0 && (
          <View style={[styles.attendeePill, { backgroundColor: colors.bg }]}>
            <Ionicons name="people" size={12} color={colors.textSecondary} />
            <Text style={[styles.attendeeText, { color: colors.textSecondary }]}>
              {attendeesCount}
            </Text>
          </View>
        )}
      </View>

      {/* Details Row */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
            {venue}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {dateStr}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    // Native-feeling soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.headline,
  },
  activity: {
    ...Typography.label,
    marginTop: Spacing.xxs,
  },
  attendeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.sm,
    gap: Spacing.xs,
  },
  attendeeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.subhead,
  },
});