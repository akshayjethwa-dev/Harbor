// src/services/exportService.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app from "../lib/firebase";
import * as NetInfo from "@react-native-community/netinfo";

const functions = getFunctions(app, "asia-south1");

export async function requestDataExport(): Promise<string> {
  // Edge Case: Offline check
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error("You must be online to request a data export.");
  }

  const auth = getAuth();
  if (!auth.currentUser) {
    throw new Error("You must be logged in.");
  }

  const exportFn = httpsCallable(functions, "exportUserData");
  
  try {
    const result = await exportFn({});
    const data = result.data as { downloadUrl: string };
    return data.downloadUrl;
  } catch (error: any) {
    console.error("Export failed:", error);
    throw new Error(error.message || "Failed to generate export. Please try again.");
  }
}