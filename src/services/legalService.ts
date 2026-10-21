// src/services/legalService.ts
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { GarbaCrewUser } from "../types/user";

export type LegalDocType = "privacy" | "terms";

export interface LegalDocument {
  type: LegalDocType;
  version: string;
  content: string; // Markdown or plain text
  updatedAt: any;
}

/**
 * Fetches the latest legal document from Firestore.
 */
export async function getLatestLegalDoc(type: LegalDocType): Promise<LegalDocument | null> {
  const docRef = doc(db, "legal_documents", type);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as LegalDocument;
  }
  return null;
}

/**
 * Records the user's consent for a specific document version.
 */
export async function recordConsent(
  uid: string,
  type: LegalDocType,
  version: string,
  hasParentalConsent: boolean
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const updates: any = {
    lastConsentDate: serverTimestamp(),
    hasParentalConsent,
  };

  if (type === "privacy") updates.acceptedPrivacyVersion = version;
  if (type === "terms") updates.acceptedTermsVersion = version;

  await updateDoc(userRef, updates);
}