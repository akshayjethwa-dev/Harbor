// src/components/OnboardingBanner.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  onCreatePress: () => void;
  onDismiss: () => void;
};

export function OnboardingBanner({ onCreatePress, onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
      ]}
    >
      {/* Small icon in a tinted circle */}
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '22' }]}>
        <Ionicons name="people" size={16} color={colors.primary} />
      </View>

      {/* Copy + primary CTA, stacked tightly */}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          Create your first Squad
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          Meet people who love what you love.
        </Text>
      </View>

      <TouchableOpacity
        onPress={onCreatePress}
        style={[styles.cta, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create a squad"
      >
        <Text style={styles.ctaText}>Create</Text>
      </TouchableOpacity>

      {/* Close (X) — replaces the old "Later" button */}
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss banner"
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 34, // room for the close X
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 60, // ≤ 68px total → ~45% smaller than the old banner
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  copy: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  subtitle: { fontSize: 11, marginTop: 1 },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});