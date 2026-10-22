// src/components/onboarding/FirstPlanPrompt.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';
import Button from '../common/Button';

type Props = {
  visible: boolean;
  hasSquad: boolean;
  onCreate: () => void;
  onDismiss: () => void;
};

export default function FirstPlanPrompt({
  visible,
  hasSquad,
  onCreate,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.primary + '14',
          borderColor: colors.primary + '33',
        },
      ]}
      // ✅ Focus Trapping Edge Case: Tell iOS VoiceOver to trap focus here
      accessibilityViewIsModal={true}
      importantForAccessibility="yes"
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons
          name={hasSquad ? 'calendar-outline' : 'people'}
          size={16}
          color={colors.primary}
        />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {hasSquad ? 'Create your first Plan' : 'Create a Squad first'}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {hasSquad
            ? 'Turn your crew into a real meetup.'
            : 'Meet people who love what you love.'}
        </Text>
      </View>

      <Button
        title={hasSquad ? 'Plan' : 'Squad'}
        onPress={onCreate}
        variant="primary"
        style={styles.cta}
        textStyle={styles.ctaText}
      />

      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss banner"
      >
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: Spacing.md,
    borderWidth: 1,
    minHeight: 60, 
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  copy: { flex: 1, justifyContent: 'center' },
  title: { ...Typography.subhead, fontWeight: '700' },
  subtitle: { ...Typography.caption, marginTop: 2 },
  cta: {
    height: 36, 
    minHeight: 36, 
    paddingHorizontal: Spacing.md,
    marginLeft: Spacing.sm,
    borderRadius: Spacing.xs,
  },
  ctaText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});