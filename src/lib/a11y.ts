// src/lib/a11y.ts
import { AccessibilityInfo } from 'react-native';

/**
 * Announces a message to the screen reader (VoiceOver / TalkBack).
 * Use this for dynamic updates, like "Plan created successfully".
 */
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Accessible Pink for primary buttons with white text.
 * Original #E91E63 fails contrast with white (3.9:1).
 * This darker shade passes WCAG AA (5.9:1).
 */
export const A11Y_PRIMARY_PINK = '#C2185B';