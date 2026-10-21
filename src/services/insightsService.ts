// src/services/insightsService.ts
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  collectionGroup, 
  Timestamp 
} from "firebase/firestore";
import { Squad, SquadInsights, ActiveMemberStat } from "../types/squad";
import { Plan } from "../types/plan";

// ─────────────────────────────────────────────────────────
// Task 44: Plan Insights
// ─────────────────────────────────────────────────────────
export interface PlanInsights {
  rsvpRate: number;
  spotsFilled: number;
  capacity: number;
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  budget: number;
  actualSpend: number;
  averageRating: number | null;
  totalRatings: number;
  hasEnoughRatings: boolean;
}

const MIN_RATINGS_FOR_SATISFACTION = 3;

export async function generatePlanInsights(plan: Plan): Promise<PlanInsights> {
  // 1. Fetch Data in Parallel
  const [tasksSnap, expensesSnap, ratingsSnap] = await Promise.all([
    getDocs(collection(db, "plans", plan.id, "tasks")),
    getDocs(collection(db, "plans", plan.id, "expenses")),
    getDocs(collection(db, "plans", plan.id, "ratings")) 
  ]);

  // 2. Calculate RSVP
  const capacity = plan.capacity > 0 ? plan.capacity : Math.max(plan.spotsFilled, 1);
  const rsvpRate = Math.round((plan.spotsFilled / capacity) * 100);

  // 3. Calculate Tasks
  let completedTasks = 0;
  tasksSnap.forEach((doc) => {
    if (doc.data().isCompleted) completedTasks++;
  });
  const totalTasks = tasksSnap.size;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 4. Calculate Budget vs Actual
  let actualSpend = 0;
  expensesSnap.forEach((doc) => {
    if (!doc.data().isFrozen) { 
      actualSpend += doc.data().amount || 0;
    }
  });

  // 5. Calculate Satisfaction
  let totalRatingSum = 0;
  let ratingCount = 0;
  ratingsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.rating && data.rating > 0) {
      totalRatingSum += data.rating;
      ratingCount++;
    }
  });

  const hasEnoughRatings = ratingCount >= MIN_RATINGS_FOR_SATISFACTION;
  const averageRating = hasEnoughRatings ? parseFloat((totalRatingSum / ratingCount).toFixed(1)) : null;

  return {
    rsvpRate: Math.min(rsvpRate, 100),
    spotsFilled: plan.spotsFilled,
    capacity: plan.capacity,
    taskCompletionRate,
    totalTasks,
    completedTasks,
    budget: plan.costTotal,
    actualSpend,
    averageRating,
    totalRatings: ratingCount,
    hasEnoughRatings,
  };
}

// ─────────────────────────────────────────────────────────
// Task 43: Squad Insights (Existing)
// ─────────────────────────────────────────────────────────
export async function generateSquadInsights(squad: Squad): Promise<SquadInsights> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = Timestamp.fromDate(oneYearAgo);

  // 1. Fetch Plans from the last year
  const plansQuery = query(
    collection(db, "plans"),
    where("squadId", "==", squad.id),
    where("createdAt", ">=", startDate)
  );
  const plansSnap = await getDocs(plansQuery);
  
  const planIds: string[] = [];
  let completedPlans = 0;
  let cancelledPlans = 0;
  let totalParticipantsCount = 0;
  let totalCheckIns = 0;
  const memberTally: Record<string, number> = {};

  plansSnap.forEach((doc) => {
    const plan = doc.data();
    planIds.push(doc.id);

    if (plan.status === "completed") completedPlans++;
    if (plan.status === "cancelled") cancelledPlans++;

    const participants = plan.participantDetails || [];
    totalParticipantsCount += participants.length;

    participants.forEach((p: any) => {
      memberTally[p.uid] = (memberTally[p.uid] || 0) + 1;
    });

    if (plan.checkIns) {
      totalCheckIns += Object.keys(plan.checkIns).length;
    }
  });

  const totalPlans = plansSnap.size;

  // 2. Fetch all Expenses for these plans (Batched)
  let totalSpent = 0;
  if (planIds.length > 0) {
    const chunks = [];
    for (let i = 0; i < planIds.length; i += 30) {
      chunks.push(planIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const expQuery = query(
        collectionGroup(db, "expenses"),
        where("planId", "in", chunk)
      );
      const expSnap = await getDocs(expQuery);
      expSnap.forEach((doc) => {
        if (!doc.data().isFrozen) {
          totalSpent += doc.data().amount || 0;
        }
      });
    }
  }

  // 3. Calculate Most Active Members
  const mostActiveMembers: ActiveMemberStat[] = Object.entries(memberTally)
    .map(([uid, count]) => {
      let foundUser: any = null;
      for (const doc of plansSnap.docs) {
        const p = doc.data().participantDetails?.find((x: any) => x.uid === uid);
        if (p) {
          foundUser = p;
          break;
        }
      }
      return {
        uid,
        name: foundUser?.name || "Former Member",
        photoUrl: foundUser?.photoUrl || null,
        planCount: count,
      };
    })
    .sort((a, b) => b.planCount - a.planCount)
    .slice(0, 5);

  // 4. Calculate Averages
  const perPersonSpend = squad.memberUids.length > 0 ? totalSpent / squad.memberUids.length : 0;
  const attendanceRate = totalParticipantsCount > 0 
    ? Math.round((totalCheckIns / totalParticipantsCount) * 100) 
    : 0;

  return {
    totalPlans,
    completedPlans,
    cancelledPlans,
    totalSpent,
    perPersonSpend,
    mostActiveMembers,
    attendanceRate,
    currentMemberCount: squad.memberUids.length,
  };
}