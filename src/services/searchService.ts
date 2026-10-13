import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plan } from "../types/plan";
import { Squad } from "../types/squad";
import { GarbaCrewUser } from "../types/user";

export interface SearchResults {
  plans: Plan[];
  squads: Squad[];
  users: GarbaCrewUser[];
}

const EMPTY: SearchResults = { plans: [], squads: [], users: [] };

export async function globalSearch(
  term: string,
  city?: string
): Promise<SearchResults> {
  const trimmed = term.trim().toLowerCase();
  if (trimmed.length < 2) return EMPTY;

  const upper = trimmed + "\uf8ff";

  // Plans — title prefix match, filtered to open/public
  const plansQ = query(
    collection(db, "plans"),
    where("visibility", "==", "public"),
    where("status", "==", "open"),
    where("titleLower", ">=", trimmed),
    where("titleLower", "<=", upper),
    orderBy("titleLower"),
    limit(15)
  );

  // Squads — name prefix match, not archived
  const squadsQ = query(
    collection(db, "squads"),
    where("isArchived", "==", false),
    where("nameLower", ">=", trimmed),
    where("nameLower", "<=", upper),
    orderBy("nameLower"),
    limit(15)
  );

  // Users — name prefix match, profile complete
  const usersQ = query(
    collection(db, "users"),
    where("profileComplete", "==", true),
    where("nameLower", ">=", trimmed),
    where("nameLower", "<=", upper),
    orderBy("nameLower"),
    limit(15)
  );

  const [plansSnap, squadsSnap, usersSnap] = await Promise.allSettled([
    getDocs(plansQ),
    getDocs(squadsQ),
    getDocs(usersQ),
  ]);

  const plans =
    plansSnap.status === "fulfilled"
      ? plansSnap.value.docs
          .map((d) => ({ id: d.id, ...d.data() } as Plan))
          .filter((p) => !city || p.city === city)
      : [];

  const squads =
    squadsSnap.status === "fulfilled"
      ? squadsSnap.value.docs
          .map((d) => ({ id: d.id, ...d.data() } as Squad))
          .filter((s) => !city || s.city === city)
      : [];

  const users =
    usersSnap.status === "fulfilled"
      ? usersSnap.value.docs.map(
          (d) => ({ uid: d.id, ...d.data() } as GarbaCrewUser)
        )
      : [];

  return { plans, squads, users };
}