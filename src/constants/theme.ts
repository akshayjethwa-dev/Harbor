// src/constants/theme.ts
import { Platform } from 'react-native';

/**
 * 4pt/8dp Grid System
 * Use these instead of hardcoded margins/padding to ensure consistent rhythm.
 */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

/**
 * Native Typography
 * iOS uses SF Pro (Human Interface Guidelines)
 * Android uses Roboto (Material 3 Type Scale)
 */
export const Typography = {
  // Large headers (e.g., screen titles)
  largeTitle: {
    fontSize: Platform.OS === 'ios' ? 34 : 32,
    fontWeight: '700' as const,
    lineHeight: Platform.OS === 'ios' ? 41 : 40,
    letterSpacing: Platform.OS === 'ios' ? 0.37 : 0,
  },
  // Section titles (e.g., "Plans nearby")
  title1: {
    fontSize: Platform.OS === 'ios' ? 28 : 24,
    fontWeight: '700' as const,
    lineHeight: Platform.OS === 'ios' ? 34 : 32,
    letterSpacing: Platform.OS === 'ios' ? 0.36 : 0,
  },
  title2: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: '700' as const,
    lineHeight: Platform.OS === 'ios' ? 28 : 28,
    letterSpacing: Platform.OS === 'ios' ? 0.35 : 0,
  },
  // Subheaders, card titles
  headline: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '600' as const,
    lineHeight: Platform.OS === 'ios' ? 22 : 24,
    letterSpacing: Platform.OS === 'ios' ? -0.41 : 0.15,
  },
  // Standard body text
  body: {
    fontSize: Platform.OS === 'ios' ? 17 : 14,
    fontWeight: '400' as const,
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
    letterSpacing: Platform.OS === 'ios' ? -0.41 : 0.25,
  },
  // Secondary text, subtitles
  subhead: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    fontWeight: '400' as const,
    lineHeight: Platform.OS === 'ios' ? 20 : 20,
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0.15,
  },
  // Captions, metadata
  caption: {
    fontSize: Platform.OS === 'ios' ? 12 : 12,
    fontWeight: '400' as const,
    lineHeight: Platform.OS === 'ios' ? 16 : 16,
    letterSpacing: Platform.OS === 'ios' ? 0 : 0.4,
  },
  // Overlines, small labels
  label: {
    fontSize: Platform.OS === 'ios' ? 13 : 11,
    fontWeight: '600' as const,
    lineHeight: Platform.OS === 'ios' ? 18 : 16,
    letterSpacing: Platform.OS === 'ios' ? -0.08 : 0.5,
  },
};