// src/services/expenseService.ts
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
import { PlanExpense, ExpenseDispute } from "../types/expense";
import { logActivity } from "./activityService"; // <-- Added

const expensesRef = (planId: string) =>
  collection(db, "plans", planId, "expenses");

export function subscribeToExpenses(
  planId: string,
  callback: (expenses: PlanExpense[]) => void
) {
  const q = query(expensesRef(planId), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snap) => {
    const expenses = snap.docs.map(
      (d) => ({ id: d.id, planId, ...d.data() } as PlanExpense)
    );
    callback(expenses);
  });
}

export async function logExpense(
  planId: string,
  expense: Omit<PlanExpense, "id" | "planId" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(expensesRef(planId), {
    ...expense,
    isFrozen: false,
    disputes: [],
    createdAt: serverTimestamp(),
  });

  // Task 19: Log to Plan Activity Feed (Private)
  await logActivity(planId, "expense_added", {
    uid: expense.paidByUid,
    name: expense.paidByName,
    photoUrl: expense.paidByPhotoUrl
  }, { 
    amount: expense.amount, 
    description: expense.description 
  }, true);

  return docRef.id;
}

export async function deleteExpense(
  planId: string,
  expenseId: string
): Promise<void> {
  await deleteDoc(doc(db, "plans", planId, "expenses", expenseId));
}

/**
 * Check for potential duplicates (same amount & payer within 5 mins)
 */
export async function checkForDuplicate(
  planId: string,
  amount: number,
  paidByUid: string
): Promise<boolean> {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const q = query(
    expensesRef(planId),
    where("paidByUid", "==", paidByUid),
    where("amount", "==", amount),
    where("createdAt", ">=", fiveMinsAgo)
  );
  
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─────────────────────────────────────────────
// Task 18: Expense Disputes
// ─────────────────────────────────────────────

/**
 * Raise a dispute against an expense.
 * This freezes the expense so it doesn't affect calculations.
 */
export async function raiseDispute(
  planId: string,
  expenseId: string,
  dispute: Omit<ExpenseDispute, "id" | "createdAt" | "status">
): Promise<void> {
  const ref = doc(db, "plans", planId, "expenses", expenseId);
  
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Expense no longer exists.");
    
    const newDispute: ExpenseDispute = {
      ...dispute,
      id: Math.random().toString(36).substring(7),
      status: "pending",
      createdAt: new Date(), // Firestore will convert
    };

    tx.update(ref, {
      isFrozen: true,
      disputes: arrayUnion(newDispute)
    });
  });
}

/**
 * Resolve a dispute (Organizer action).
 * Accept: Deletes the expense.
 * Reject: Unfreezes the expense, marks dispute as rejected.
 * Reject False: Same as reject, but adds `isFalse: true` (triggers strike).
 * Escalate: Marks dispute as escalated, keeps expense frozen.
 */
export async function resolveDispute(
  planId: string,
  expenseId: string,
  action: "accept" | "reject" | "escalate" | "reject_false"
): Promise<void> {
  const ref = doc(db, "plans", planId, "expenses", expenseId);
  
  if (action === "accept") {
    // Accepting the dispute means the expense is invalid, so delete it.
    await deleteDoc(ref);
    return;
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    
    const data = snap.data() as PlanExpense;
    const updatedDisputes = (data.disputes || []).map(d => ({
      ...d,
      status: action === "escalate" ? "escalated" : "rejected",
      isFalse: action === "reject_false"
    }));

    // If escalated, it remains frozen until admin resolves. 
    // If rejected, we unfreeze it.
    tx.update(ref, {
      disputes: updatedDisputes,
      isFrozen: action === "escalate"
    });
  });
}