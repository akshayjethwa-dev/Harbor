// src/types/expense.ts
import { Timestamp } from "firebase/firestore";

export type SplitType = "equal" | "custom" | "percentage";

export interface ExpenseSplit {
  uid: string;
  name: string;
  /** The exact amount this person owes in the base currency */
  amountOwed: number;
  /** Only populated if splitType is "percentage" */
  percentage?: number;
}

export interface PlanExpense {
  id: string;
  planId: string;
  description: string;
  
  // Currency Data
  amount: number; // Total amount in base currency
  currency: string;
  originalAmount?: number; // If foreign currency
  exchangeRate?: number; // Rate applied
  
  // Payer
  paidByUid: string;
  paidByName: string;
  paidByPhotoUrl: string | null;
  
  // Split
  splitType: SplitType;
  splitAmong: ExpenseSplit[];
  
  isPostPlan: boolean;
  createdAt: Timestamp | any;
  disputes?: ExpenseDispute[];
  isFrozen?: boolean;
  reactions?: Record<string, string[]>;
}

export interface Settlement {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
}

export interface SettlementRecord {
  id: string;
  planId: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  paymentMethod: "upi" | "manual";
  createdAt: Timestamp | any;
}

export interface ExpenseDispute {
  id: string;
  reason: string;
  evidenceUrl?: string;
  raisedByUid: string;
  raisedByName: string;
  createdAt: Timestamp | any;
  status: "pending" | "accepted" | "rejected" | "escalated";
  isFalse?: boolean;
}