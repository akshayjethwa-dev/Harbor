// src/lib/onboarding.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISS_KEY = '@Kithra/onboarding_banner_dismissed_at';
const SQUAD_CREATED_KEY = '@Kithra/squad_created_at';
const TRUST_PRIMER_SEEN_KEY = '@Kithra/trust_primer_seen';

// ─── 7-day default ────────────────────────────────────────────
export const BANNER_REAPPEAR_MS = 7 * 24 * 60 * 60 * 1000;

/** Persist that the user dismissed the banner right now. */
export async function dismissBanner(): Promise<void> {
  await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
}

/** Call this after a successful squad creation. */
export async function markSquadCreated(): Promise<void> {
  await AsyncStorage.setItem(SQUAD_CREATED_KEY, String(Date.now()));
}

/**
 * Show the banner when:
 * • user has never created a squad, AND
 * • banner was never dismissed, OR was dismissed more than 7 days ago.
 */
export async function shouldShowBanner(): Promise<boolean> {
  const squadCreatedAt = await AsyncStorage.getItem(SQUAD_CREATED_KEY);
  if (squadCreatedAt) return false;
  const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return true;
  return Date.now() - Number(dismissedAt) > BANNER_REAPPEAR_MS;
}

// ─── Trust Primer ───────────────────────────────────────────────

/** Returns true if the user has already seen the Trust Primer. */
export async function hasSeenTrustPrimer(): Promise<boolean> {
  const seen = await AsyncStorage.getItem(TRUST_PRIMER_SEEN_KEY);
  return !!seen;
}

/** Marks the Trust Primer as seen so it does not auto-show again. */
export async function markTrustPrimerSeen(): Promise<void> {
  await AsyncStorage.setItem(TRUST_PRIMER_SEEN_KEY, String(Date.now()));
}

/** Dev helper — reset both flags (useful while testing). */
export async function resetOnboardingFlags(): Promise<void> {
  await AsyncStorage.multiRemove([DISMISS_KEY, SQUAD_CREATED_KEY, TRUST_PRIMER_SEEN_KEY]);
}