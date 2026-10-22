// src/config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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
let auth: FirebaseAuth.Auth | null = null;
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
      // Web: use default persistence
      auth = FirebaseAuth.getAuth(app);
    } else {
      // Native (Android/iOS): use AsyncStorage persistence so the
      // login session survives app restarts.
      const getRNPersistence: any = (FirebaseAuth as any).getReactNativePersistence;
      if (getRNPersistence) {
        try {
          // Lazy require so this file doesn't hard-fail if the package
          // isn't installed yet.
          const AsyncStorage =
            require('@react-native-async-storage/async-storage').default;
          auth = FirebaseAuth.initializeAuth(app, {
            persistence: getRNPersistence(AsyncStorage),
          });
        } catch (e) {
          // initializeAuth throws if auth was already initialized
          // (e.g. from a fast-refresh). Fall back to getAuth.
          auth = FirebaseAuth.getAuth(app);
        }
      } else {
        // Older/newer Firebase versions without getReactNativePersistence
        auth = FirebaseAuth.getAuth(app);
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