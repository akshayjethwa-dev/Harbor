// src/utils/settlement.ts
import { PlanExpense, Settlement, SettlementRecord } from "../types/expense";
import { PlanParticipant } from "../types/plan";

export interface BalanceResult {
  netBalances: Record<string, number>;
  settlements: Settlement[];
}

export function calculateSettlements(
  expenses: PlanExpense[],
  settlementsList: SettlementRecord[],
  participants: PlanParticipant[]
): BalanceResult {
  const netBalances: Record<string, number> = {};
  
  participants.forEach((p) => { netBalances[p.uid] = 0; });

  // 1. Add Expenses (Payer +, Splitters -)
  expenses.forEach((exp) => {
    // Task 18: Skip frozen expenses (disputed)
    if (exp.isFrozen) return;

    if (netBalances[exp.paidByUid] !== undefined) {
      netBalances[exp.paidByUid] += exp.amount;
    }
    exp.splitAmong.forEach((split) => {
      if (netBalances[split.uid] !== undefined) {
        netBalances[split.uid] -= split.amountOwed;
      }
    });
  });

  // 2. Subtract Settlements (Payer +, Receiver -)
  settlementsList.forEach((settle) => {
    if (netBalances[settle.fromUid] !== undefined) {
      netBalances[settle.fromUid] += settle.amount;
    }
    if (netBalances[settle.toUid] !== undefined) {
      netBalances[settle.toUid] -= settle.amount;
    }
  });

  // Round to 2 decimal places
  Object.keys(netBalances).forEach((uid) => {
    netBalances[uid] = Math.round(netBalances[uid] * 100) / 100;
  });

  const debtors: { uid: string; amount: number }[] = [];
  const creditors: { uid: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([uid, amount]) => {
    if (amount < -0.01) debtors.push({ uid, amount: -amount });
    else if (amount > 0.01) creditors.push({ uid, amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const resultSettlements: Settlement[] = [];
  let i = 0; let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount > 0) {
      const fromUser = participants.find((p) => p.uid === debtor.uid);
      const toUser = participants.find((p) => p.uid === creditor.uid);

      resultSettlements.push({
        fromUid: debtor.uid,
        fromName: fromUser?.name || "Unknown",
        toUid: creditor.uid,
        toName: toUser?.name || "Unknown",
        amount: roundedAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return { netBalances, settlements: resultSettlements };
}