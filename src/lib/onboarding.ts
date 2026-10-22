// src/lib/onboarding.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISS_KEY = '@Kithra/onboarding_banner_dismissed_at';
const SQUAD_CREATED_KEY = '@Kithra/squad_created_at';

// ─── 7-day default ────────────────────────────────────────────
// ✅ Production value:
export const BANNER_REAPPEAR_MS = 7 * 24 * 60 * 60 * 1000;

// 🧪 Dev test value — uncomment the line below, dismiss the banner,
// kill the app, wait 30 s, relaunch → banner should reappear.
// export const BANNER_REAPPEAR_MS = 30 * 1000;

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
 *   • user has never created a squad, AND
 *   • banner was never dismissed, OR was dismissed more than 7 days ago.
 */
export async function shouldShowBanner(): Promise<boolean> {
  const squadCreatedAt = await AsyncStorage.getItem(SQUAD_CREATED_KEY);
  if (squadCreatedAt) return false;

  const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return true;

  return Date.now() - Number(dismissedAt) > BANNER_REAPPEAR_MS;
}

/** Dev helper — reset both flags (useful while testing). */
export async function resetOnboardingFlags(): Promise<void> {
  await AsyncStorage.multiRemove([DISMISS_KEY, SQUAD_CREATED_KEY]);
}