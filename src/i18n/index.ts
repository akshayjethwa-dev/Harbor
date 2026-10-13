import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en";
import hi from "./hi";
import gu from "./gu";

export const i18n = new I18n({ en, hi, gu });

i18n.enableFallback = true;
i18n.defaultLocale = "en";

const STORAGE_KEY = "@garbacrew:locale";
const SUPPORTED: Array<"en" | "hi" | "gu"> = ["en", "hi", "gu"];

// ─────────────────────────────────────────────────────────
// Runtime environment detection
// SSR (Node.js) has no `window`; the browser and native both do.
// ─────────────────────────────────────────────────────────
const isBrowser =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// ─────────────────────────────────────────────────────────
// Custom listener registry
// i18n-js v4 removed onChange/offChange — we implement a tiny emitter.
// ─────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToLocaleChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn("[i18n] listener error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────
// Determine the initial locale without touching storage
// ─────────────────────────────────────────────────────────
function getSystemLocale(): "en" | "hi" | "gu" {
  try {
    const code = Localization.getLocales()[0]?.languageCode ?? "en";
    return SUPPORTED.includes(code as any) ? (code as any) : "en";
  } catch {
    return "en";
  }
}

// ─────────────────────────────────────────────────────────
// initI18n — safe on SSR
// ─────────────────────────────────────────────────────────
export async function initI18n(): Promise<void> {
  // Server-side: use system locale, don't touch storage
  if (!isBrowser) {
    i18n.locale = getSystemLocale();
    return;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored as any)) {
      i18n.locale = stored;
      notifyListeners();
      return;
    }
    i18n.locale = getSystemLocale();
    notifyListeners();
  } catch (error) {
    // Storage failed — fall back to system locale. App keeps working.
    console.warn("[i18n] storage unavailable, using system locale");
    i18n.locale = getSystemLocale();
    notifyListeners();
  }
}

// ─────────────────────────────────────────────────────────
// setLocale — safe on SSR (no-op if not in browser)
// ─────────────────────────────────────────────────────────
export async function setLocale(locale: "en" | "hi" | "gu"): Promise<void> {
  i18n.locale = locale;
  notifyListeners();

  if (!isBrowser) return;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore — locale still changed in-memory
  }
}

export function t(key: string, params?: Record<string, any>): string {
  return i18n.t(key, params);
}