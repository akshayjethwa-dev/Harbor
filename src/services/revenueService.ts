// src/services/revenueService.ts
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { HostPayout } from "../types/payout";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export interface RevenueSummary {
  gross: number;
  fees: number;
  net: number;
  pending: number;
}

export async function fetchHostRevenue(hostUid: string): Promise<{ payouts: HostPayout[]; summary: RevenueSummary }> {
  // In a real app, you might have a dedicated "payouts" collection.
  // For this implementation, we simulate fetching payouts based on completed plans.
  
  const payoutsQ = query(
    collection(db, "payouts"),
    where("hostUid", "==", hostUid),
    orderBy("createdAt", "desc")
  );
  
  const snap = await getDocs(payoutsQ);
  const payouts = snap.docs.map(d => ({ id: d.id, ...d.data() } as HostPayout));

  const summary: RevenueSummary = { gross: 0, fees: 0, net: 0, pending: 0 };

  payouts.forEach(p => {
    if (p.status !== "refunded") {
      summary.gross += p.grossAmount;
      summary.fees += p.platformFee;
      summary.net += p.netAmount;
    }
    if (p.status === "pending" || p.status === "processing") {
      summary.pending += p.netAmount;
    }
  });

  return { payouts, summary };
}

export async function exportPayoutsToCSV(payouts: HostPayout[]): Promise<void> {
  if (payouts.length === 0) return;

  const header = "Date,Plan,Gross Amount,Platform Fee,Net Payout,Status,UPI ID\n";
  const rows = payouts.map(p => {
    const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : "N/A";
    return `"${date}","${p.planTitle}",${p.grossAmount},${p.platformFee},${p.netAmount},"${p.status}","${p.upiId}"`;
  }).join("\n");

  const csvContent = header + rows;

  if (Platform.OS === "web") {
    // Web Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Kithra_revenue.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Native Share
  const fileUri = FileSystem.cacheDirectory + "Kithra_revenue.csv";
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Export Revenue",
      UTI: "public.comma-separated-values-text",
    });
  }
}