// src/components/plan/PlanCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan } from '../../types/plan';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';
import TrustBadge from "../common/TrustBadge";

// Define the platform median for Host Score (e.g., 4.5 out of 5)
const MEDIAN_HOST_SCORE = 4.5;

type Props = {
  plan: Plan;
  onPress?: () => void;
};

export default function PlanCard({ plan, onPress }: Props) {
  const { colors } = useTheme();

  const venue = plan.locationName || plan.city || 'Location TBD';
  const dateStr = plan.startTime ? new Date(plan.startTime.toDate()).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) : 'Upcoming';
  const attendeesCount = plan.spotsFilled || 0;

  const hostScore = plan.hostScore ?? 0;
  const hostStreak = plan.hostStreak ?? 0;
  
  // Determine if the host has any trust data to display
  const hasTrustData = plan.hostVerified || hostScore > 0 || hostStreak > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgElevated }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {plan.title || 'Untitled Plan'}
          </Text>
          
          {/* Host Row */}
          <View style={styles.hostRow}>
            <Text style={[styles.hostName, { color: colors.textSecondary }]}>
              by {plan.hostName}
            </Text>
            
            {hasTrustData ? (
              <View style={styles.badgeRow}>
                {plan.hostVerified && <TrustBadge type="verified" size="sm" />}
                {hostScore > MEDIAN_HOST_SCORE && (
                  <TrustBadge type="host_score" value={hostScore} size="sm" />
                )}
              </View>
            ) : (
              <Text style={[styles.newHostText, { color: colors.textMuted }]}>
                New host
              </Text>
            )}
          </View>

          <Text style={[styles.activity, { color: colors.textMuted }]}>
            {plan.activity?.toUpperCase()}
          </Text>
        </View>

        {/* Attendees Pill */}
        {attendeesCount > 0 && (
          <View style={[styles.attendeePill, { backgroundColor: colors.bgSubtle }]}>
            <Ionicons name="people" size={14} color={colors.primary} />
            <Text style={[styles.attendeeText, { color: colors.primary }]}>
              {attendeesCount}
            </Text>
          </View>
        )}
      </View>

      {/* Details Row */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {venue}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {dateStr}
          </Text>
        </View>
        
        {/* Streak Flame in Metadata Row */}
        {hostStreak > 0 && (
          <TrustBadge type="streak" value={hostStreak} size="sm" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  hostName: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newHostText: {
    ...Typography.caption,
    fontStyle: 'italic',
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