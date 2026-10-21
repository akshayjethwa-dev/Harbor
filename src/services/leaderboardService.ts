// src/services/leaderboardService.ts
import { db } from "../lib/firebase";
import { 
  collection, query, where, getDocs, Timestamp 
} from "firebase/firestore";
import { Squad } from "../types/squad";
import { GarbaCrewUser } from "../types/user";

export interface LeaderboardEntry {
  uid: string;
  name: string;
  photoUrl: string | null;
  plansCount: number;
  tasksCount: number;
  expenseTotal: number;
  score: number;
  rank: number;
}

export async function getSquadLeaderboard(squad: Squad): Promise<LeaderboardEntry[]> {
  // 1. Calculate Start of Current Month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTimestamp = Timestamp.fromDate(startOfMonth);

  // 2. Fetch Plans for this squad in the current month
  const plansQ = query(
    collection(db, "plans"),
    where("squadId", "==", squad.id),
    where("createdAt", ">=", startTimestamp)
  );
  const plansSnap = await getDocs(plansQ);

  // 3. Initialize stats for all squad members
  const stats: Record<string, LeaderboardEntry> = {};
  
  // Fetch full user profiles for all members
  const memberUids = squad.memberUids;
  if (memberUids.length > 0) {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("uid", "in", memberUids.slice(0, 30)))
    );
    
    usersSnap.forEach((doc) => {
      const u = doc.data() as GarbaCrewUser;
      // Opt-out check
      if (u.showOnLeaderboard !== false) {
        stats[u.uid] = {
          uid: u.uid,
          name: u.name || "Unknown",
          photoUrl: u.photoUrl || null,
          plansCount: 0,
          tasksCount: 0,
          expenseTotal: 0,
          score: 0,
          rank: 0,
        };
      }
    });
  }

  // 4. Aggregate Plan Data
  for (const planDoc of plansSnap.docs) {
    const plan = planDoc.data();

    // Tally Plans Attended
    plan.participantDetails?.forEach((p: any) => {
      if (stats[p.uid]) stats[p.uid].plansCount += 1;
    });

    // Fetch Tasks for this plan
    const tasksSnap = await getDocs(collection(db, "plans", planDoc.id, "tasks"));
    tasksSnap.forEach((t) => {
      const task = t.data();
      if (task.isCompleted && task.completedBy && stats[task.completedBy]) {
        stats[task.completedBy].tasksCount += 1;
      }
    });

    // Fetch Expenses for this plan
    const expensesSnap = await getDocs(collection(db, "plans", planDoc.id, "expenses"));
    expensesSnap.forEach((e) => {
      const exp = e.data();
      // Only count if not frozen and paid by a squad member
      if (!exp.isFrozen && stats[exp.paidByUid]) {
        stats[exp.paidByUid].expenseTotal += (exp.amount || 0);
      }
    });
  }

  // 5. Calculate Scores and Sort
  const activeMembers: LeaderboardEntry[] = [];
  const inactiveMembers: LeaderboardEntry[] = [];

  Object.values(stats).forEach((entry) => {
    // Composite Score: (Plans * 5) + (Tasks * 3) + (Expenses / 100)
    entry.score = (entry.plansCount * 5) + (entry.tasksCount * 3) + Math.floor(entry.expenseTotal / 100);
    
    if (entry.score > 0) {
      activeMembers.push(entry);
    } else {
      inactiveMembers.push(entry);
    }
  });

  // Sort active members by score descending
  activeMembers.sort((a, b) => b.score - a.score);

  // 6. Assign Ranks (Tie handling)
  let currentRank = 1;
  for (let i = 0; i < activeMembers.length; i++) {
    if (i > 0 && activeMembers[i].score < activeMembers[i - 1].score) {
      currentRank = i + 1;
    }
    activeMembers[i].rank = currentRank;
  }

  // Sort inactive members alphabetically
  inactiveMembers.sort((a, b) => a.name.localeCompare(b.name));

  // Return active members followed by inactive members
  return [...activeMembers, ...inactiveMembers];
}