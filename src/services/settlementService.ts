// src/services/settlementService.ts
import { db } from "../lib/firebase";
import { collection, doc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { SettlementRecord } from "../types/expense";

export function subscribeToSettlements(planId: string, callback: (data: SettlementRecord[]) => void) {
  const q = query(collection(db, "plans", planId, "settlements"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as SettlementRecord)));
  });
}

export async function recordSettlement(
  planId: string,
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
  amount: number,
  method: "upi" | "manual"
): Promise<void> {
  await addDoc(collection(db, "plans", planId, "settlements"), {
    planId, fromUid, fromName, toUid, toName, amount, paymentMethod: method, createdAt: serverTimestamp()
  });
}