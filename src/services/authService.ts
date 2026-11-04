// src/services/authService.ts
import {
  PhoneAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { GarbaCrewUser } from "../types/user";

// ─────────────────────────────────────────────────────────
// Phone OTP
// ─────────────────────────────────────────────────────────
export async function verifyOTP(
  verificationId: string,
  code: string
): Promise<{ user: GarbaCrewUser | null; isNewUser: boolean; error?: string }> {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(auth, credential);
    const { user } = userCredential;
    return await upsertUserDoc(user, user.phoneNumber);
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return { user: null, isNewUser: false, error: getOTPError(error.code) };
  }
}

// ─────────────────────────────────────────────────────────
// Google Sign-In — Native (idToken from expo-auth-session)
// ─────────────────────────────────────────────────────────
export async function signInWithGoogle(idToken: string): Promise<{
  user: GarbaCrewUser | null;
  isNewUser: boolean;
  needsPhone: boolean;
  error?: string;
}> {
  try {
    if (!idToken || typeof idToken !== "string") {
      throw new Error("Invalid idToken");
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const { user } = userCredential;
    const result = await upsertUserDoc(user, user.phoneNumber);
    return { ...result, needsPhone: !result.user?.phone };
  } catch (error: any) {
    console.error("Google sign-in (native) error:", error);
    return {
      user: null,
      isNewUser: false,
      needsPhone: false,
      error: getGoogleAuthError(error.code),
    };
  }
}

// ─────────────────────────────────────────────────────────
// Google Sign-In — Web (Firebase signInWithPopup)
// ─────────────────────────────────────────────────────────
export async function signInWithGoogleWeb(): Promise<{
  user: GarbaCrewUser | null;
  isNewUser: boolean;
  needsPhone: boolean;
  error?: string;
}> {
  try {
    // Dynamic require so Metro doesn't try to statically resolve
    // signInWithPopup from the RN bundle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { signInWithPopup } = require("firebase/auth");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const userCredential = await signInWithPopup(auth, provider);
    const { user } = userCredential;
    const result = await upsertUserDoc(user, user.phoneNumber);
    return { ...result, needsPhone: !result.user?.phone };
  } catch (error: any) {
    console.error("Google sign-in (web) error:", {
      code: error.code,
      message: error.message,
    });

    // Handle User Cancellation gracefully
    if (error.code === "auth/popup-closed-by-user") {
      return {
        user: null,
        isNewUser: false,
        needsPhone: false,
        error: "cancelled", // UI will intercept this and do nothing
      };
    }

    // Handle Browser Popup Blockers (fallback to redirect)
    if (error.code === "auth/popup-blocked") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { signInWithRedirect } = require("firebase/auth");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        
        await signInWithRedirect(auth, provider);
        return {
          user: null,
          isNewUser: false,
          needsPhone: false,
          error: "redirecting", // Page will redirect
        };
      } catch (redirectError) {
        return {
          user: null,
          isNewUser: false,
          needsPhone: false,
          error: "Your browser blocked the popup. Please allow popups and try again.",
        };
      }
    }

    return {
      user: null,
      isNewUser: false,
      needsPhone: false,
      error: getGoogleAuthError(error.code),
    };
  }
}

// ─────────────────────────────────────────────────────────
// Shared: create or fetch the Firestore user document
// ─────────────────────────────────────────────────────────
async function upsertUserDoc(
  user: any,
  phoneFromProvider: string | null
): Promise<{ user: GarbaCrewUser | null; isNewUser: boolean }> {
  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const existing = userDoc.data() as GarbaCrewUser;
    if (phoneFromProvider && !existing.phone) {
      await setDoc(userDocRef, { phone: phoneFromProvider }, { merge: true });
      return {
        user: { ...existing, phone: phoneFromProvider, uid: user.uid },
        isNewUser: false,
      };
    }
    return { user: { ...existing, uid: user.uid }, isNewUser: false };
  }

  const newUser: GarbaCrewUser = {
    uid: user.uid,
    phone: phoneFromProvider,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoUrl: user.photoURL ?? null,
    createdAt: serverTimestamp() as any,
    profileComplete: false,
    isVerified: false,
    selfieVerified: false,
    profileScore: 0,
    hostScore: 50,
    guestScore: 50,
    trustBalance: 50,
    escrowBalance: 0,
    streak: 0,
    plansHosted: 0,
    plansJoined: 0,
    completedPlans: 0,
  };
  await setDoc(userDocRef, newUser);
  return { user: newUser, isNewUser: true };
}

// ─────────────────────────────────────────────────────────
// Error message helpers
// ─────────────────────────────────────────────────────────
function getOTPError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-verification-code": "Incorrect OTP. Please check and re-enter.",
    "auth/code-expired": "OTP expired. Please request a new one.",
    "auth/too-many-requests": "Too many attempts. Please wait 5 minutes.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || "Verification failed. Please try again.";
}

function getGoogleAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/argument-error":
      "Invalid Google credential. Check your Firebase Console → Google → Web client ID.",
    "auth/invalid-credential": "Invalid credential. Please try again.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/operation-not-allowed":
      "Google Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
    "auth/unauthorized-domain":
      "This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/internal-error":
      "Google Sign-In failed. Please verify your Web Client ID in Firebase Console.",
  };
  return map[code] || `Google sign-in failed. (${code || "unknown"})`;
}