// src/config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore: getReactNativePersistence exists in the RN runtime bundle,
  // but is missing from Firebase SDK public TS types (known limitation).
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * IMPORTANT (Expo/Metro requirement):
 * Expo only inlines env vars into the JS bundle when accessed with the
 * LITERAL key `process.env.EXPO_PUBLIC_XXX`. Dynamic access like
 * `process.env[key]` returns undefined in the built APK.
 */
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

export const isFirebaseConfigured = Boolean(apiKey && projectId && authDomain);

let app: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);

    // ---- Auth with platform-specific persistence ----
    if (Platform.OS === 'web') {
      // Web: default persistence (IndexedDB / localStorage).
      auth = getAuth(app);
    } else {
      // Native (Android/iOS): initializeAuth + AsyncStorage persistence so
      // the login session survives app restarts.
      try {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (e: any) {
        // Fast Refresh / hot reload: auth may already be initialized.
        // Only swallow the "already-initialized" case; rethrow anything else
        // so real config problems don't get hidden.
        const msg: string = e?.message ?? '';
        if (
          e?.code === 'auth/already-initialized' ||
          msg.toLowerCase().includes('already-initialized') ||
          msg.toLowerCase().includes('already initialized')
        ) {
          auth = getAuth(app);
        } else {
          throw e;
        }
      }
    }
  } catch (err) {
    console.warn(
      '[Kithra] Firebase init failed, operating in mock data mode',
      err,
    );
  }
}

export { app, auth, db, storage };