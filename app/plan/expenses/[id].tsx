// app/plan/expenses/[id].tsx
import React, { useEffect, useState, useMemo } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { Plan } from "../../../src/types/plan";
import { PlanExpense, SettlementRecord, Settlement } from "../../../src/types/expense";
import { CollectRequest } from "../../../src/types/collect";
import { subscribeToExpenses, logExpense, deleteExpense, checkForDuplicate } from "../../../src/services/expenseService";
import { subscribeToSettlements } from "../../../src/services/settlementService";
import { subscribeToCollectRequests, createCollectRequest } from "../../../src/services/collectService";
import { getUsersByIds } from "../../../src/services/userService";
import { calculateSettlements } from "../../../src/utils/settlement";
import { useAuth } from "../../../src/context/AuthContext";
import ExpenseCard from "../../../src/components/plan/ExpenseCard";
import AddExpenseModal from "../../../src/components/plan/AddExpenseModal";
import BalancesView from "../../../src/components/plan/BalancesView";
import SettleUpModal from "../../../src/components/plan/SettleUpModal";
import BudgetProgress from "../../../src/components/plan/BudgetProgress";
import EditBudgetModal from "../../../src/components/plan/EditBudgetModal";
import CollectRequestModal from "../../../src/components/plan/CollectRequestModal";
import CollectRequestCard from "../../../src/components/plan/CollectRequestCard";
import DisputeExpenseModal from "../../../src/components/plan/DisputeExpenseModal";
import ResolveDisputeModal from "../../../src/components/plan/ResolveDisputeModal";
import CommentsModal from "../../../src/components/plan/CommentsModal";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

export default function PlanExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [expenses, setExpenses] = useState<PlanExpense[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<SettlementRecord[]>([]);
  const [collectRequests, setCollectRequests] = useState<CollectRequest[]>([]);
  const [participantUsers, setParticipantUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [activeDisputeExpense, setActiveDisputeExpense] = useState<PlanExpense | null>(null);
  const [activeResolveExpense, setActiveResolveExpense] = useState<PlanExpense | null>(null);
  const [activeCommentExpense, setActiveCommentExpense] = useState<PlanExpense | null>(null);
  
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "collect">("expenses");
  const [activeSettlement, setActiveSettlement] = useState<Settlement | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) setPlan({ id: snap.id, ...snap.data() } as Plan);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (plan?.participants) {
      getUsersByIds(plan.participants).then(setParticipantUsers);
    }
  }, [plan?.participants]);

  useEffect(() => {
    if (!id) return;
    const unsub1 = subscribeToExpenses(id, (data) => {
      setExpenses(data);
      setLoading(false);
    });
    const unsub2 = subscribeToSettlements(id, setSettlementRecords);
    const unsub3 = subscribeToCollectRequests(id, setCollectRequests);
    
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [id]);

  const isOrganizer = user?.uid === plan?.hostUid;
  const isParticipant = plan?.participants?.includes(user?.uid || "") || false;
  const canAddExpense = isOrganizer || isParticipant;

  const totalSpent = expenses.reduce((sum, e) => sum + (e.isFrozen ? 0 : e.amount), 0);

  const handleSave = async (data: any) => {
    if (!id || !plan) return;

    const isDup = await checkForDuplicate(id, data.amount, data.paidByUid);
    if (isDup) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Possible Duplicate",
          "An expense with this exact amount and payer was just logged. Add anyway?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Add anyway", onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    const oldSpent = totalSpent;
    const newSpent = oldSpent + data.amount;
    const budget = plan.costTotal || 0;

    if (budget > 0) {
      const oldPct = (oldSpent / budget) * 100;
      const newPct = (newSpent / budget) * 100;

      if (oldPct < 80 && newPct >= 80 && newPct < 100) {
        Alert.alert("Budget Alert", "You have reached 80% of the plan's budget.");
      } else if (oldPct < 100 && newPct >= 100) {
        Alert.alert("Budget Exceeded", "This expense puts the plan over budget.");
      }
    }

    let isPostPlan = false;
    if (plan.endTime) {
      const endMs = plan.endTime.toMillis ? plan.endTime.toMillis() : new Date(plan.endTime).getTime();
      if (Date.now() > endMs) isPostPlan = true;
    }

    await logExpense(id, { ...data, isPostPlan });
  };

  const handleCreateCollect = async (title: string, total: number, targets: any[]) => {
    if (!plan || !user) return;
    
    const isDup = collectRequests.some(r => r.status === "active" && r.title === title);
    if (isDup) {
      Alert.alert("Duplicate Request", "An active request with this title already exists.");
      return;
    }

    await createCollectRequest(
      plan.id,
      { uid: user.uid, name: user.name || "Organizer", upiId: user.upiId || "" },
      title,
      total,
      targets
    );
  };

  const handleDelete = (expId: string) => {
    Alert.alert("Delete Expense", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          if (id) await deleteExpense(id, expId);
        } 
      }
    ]);
  };

  const { netBalances, settlements } = useMemo(() => {
    if (!plan) return { netBalances: {}, settlements: [] };
    return calculateSettlements(expenses, settlementRecords, plan.participantDetails || []);
  }, [expenses, settlementRecords, plan]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses & Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <BudgetProgress 
        spent={totalSpent}
        budget={plan?.costTotal || 0}
        participantCount={plan?.participantDetails?.length || 1}
        canEdit={isOrganizer}
        onEditBudget={() => setShowBudgetModal(true)}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "expenses" && styles.tabActive]}
          onPress={() => setActiveTab("expenses")}
        >
          <Text style={[styles.tabText, activeTab === "expenses" && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "balances" && styles.tabActive]}
          onPress={() => setActiveTab("balances")}
        >
          <Text style={[styles.tabText, activeTab === "balances" && styles.tabTextActive]}>Balances</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "collect" && styles.tabActive]}
          onPress={() => setActiveTab("collect")}
        >
          <Text style={[styles.tabText, activeTab === "collect" && styles.tabTextActive]}>Collect</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {activeTab === "expenses" ? (
            expenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses logged yet.</Text>
            ) : (
              expenses.map((exp) => (
                <ExpenseCard
                  key={exp.id}
                  expense={exp}
                  planId={id || ""} // <-- Added
                  canDelete={isOrganizer || exp.paidByUid === user?.uid}
                  onDelete={() => handleDelete(exp.id)}
                  onDispute={() => setActiveDisputeExpense(exp)}
                  onResolve={() => setActiveResolveExpense(exp)}
                  onComment={() => setActiveCommentExpense(exp)}
                />
              ))
            )
          ) : activeTab === "balances" ? (
            <BalancesView 
              netBalances={netBalances} 
              settlements={settlements} 
              participants={plan?.participantDetails || []} 
              onSettle={(s) => setActiveSettlement(s)}
            />
          ) : (
            collectRequests.length === 0 ? (
              <Text style={styles.emptyText}>No collect requests yet.</Text>
            ) : (
              collectRequests.map(req => (
                <CollectRequestCard 
                  key={req.id} 
                  request={req} 
                  isOrganizer={isOrganizer} 
                  currentUserId={user?.uid || ""} 
                />
              ))
            )
          )}
        </ScrollView>
      )}

      {canAddExpense && activeTab === "expenses" && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Text style={styles.fabText}>+ Log Expense</Text>
        </TouchableOpacity>
      )}

      {isOrganizer && activeTab === "collect" && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCollectModal(true)}>
          <Text style={styles.fabText}>+ New Request</Text>
        </TouchableOpacity>
      )}

      {plan && (
        <AddExpenseModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          participants={plan.participantDetails || []}
          plan={plan}
        />
      )}

      {plan && (
        <EditBudgetModal
          visible={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          planId={plan.id}
          currentBudget={plan.costTotal || 0}
        />
      )}

      {plan && user && (
        <CollectRequestModal
          visible={showCollectModal}
          onClose={() => setShowCollectModal(false)}
          onSave={handleCreateCollect}
          participants={plan.participantDetails || []}
          participantUsers={participantUsers}
          organizerUpi={user.upiId || ""}
        />
      )}

      <SettleUpModal 
        visible={!!activeSettlement}
        onClose={() => setActiveSettlement(null)}
        settlement={activeSettlement}
        planId={id || ""}
        onSettled={() => Alert.alert("Success", "Settlement logged!")}
      />

      {id && (
        <>
          <DisputeExpenseModal
            visible={!!activeDisputeExpense}
            onClose={() => setActiveDisputeExpense(null)}
            expense={activeDisputeExpense}
            planId={id}
          />
          <ResolveDisputeModal
            visible={!!activeResolveExpense}
            onClose={() => setActiveResolveExpense(null)}
            expense={activeResolveExpense}
            planId={id}
          />
        </>
      )}

      {activeCommentExpense && (
        <CommentsModal
          visible={!!activeCommentExpense}
          onClose={() => setActiveCommentExpense(null)}
          planId={id || ""}
          itemId={activeCommentExpense.id}
          itemType="expense"
          itemTitle={activeCommentExpense.description}
          participants={plan?.participantDetails || []}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    backIcon: { fontSize: 22, color: c.text },
    headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },

    tabBar: {
      flexDirection: "row", marginHorizontal: 16, marginBottom: 8,
      backgroundColor: c.bgSubtle, borderRadius: 10, padding: 4,
    },
    tab: {
      flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8,
    },
    tabActive: {
      backgroundColor: c.bgElevated, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
    },
    tabText: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    tabTextActive: { color: c.text, fontWeight: "700" },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { textAlign: "center", color: c.textMuted, marginTop: 40, fontSize: 15 },
    
    fab: {
      position: "absolute", bottom: 24, right: 24, backgroundColor: c.primary,
      paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
    },
    fabText: { color: c.textInverse, fontWeight: "800", fontSize: 15 },
  });