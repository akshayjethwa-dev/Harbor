import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Squad, SquadDraft, SquadMember } from "../types/squad";
import { GarbaCrewUser } from "../types/user";

// ─────────────────────────────────────────────────────────
// Create Squad
// ─────────────────────────────────────────────────────────
export async function createSquad(
  admin: GarbaCrewUser,
  draft: SquadDraft
): Promise<string> {
  if (!draft.name.trim()) throw new Error("Squad name is required");
  if (!draft.activity) throw new Error("Activity is required");
  if (!draft.city) throw new Error("City is required");
  if (draft.activity === "custom" && !draft.activityCustom.trim()) {
    throw new Error("Describe your custom activity");
  }
  if (draft.recurringEnabled && draft.recurringDayOfWeek === null) {
    throw new Error("Pick a day of the week for the recurring pattern");
  }
  if (draft.recurringEnabled && !/^\d{2}:\d{2}$/.test(draft.recurringTime)) {
    throw new Error("Recurring time must be in HH:MM format");
  }

  const squadsRef = collection(db, "squads");
  const newRef = doc(squadsRef);
  const squadId = newRef.id;

  const adminMember: SquadMember = {
    uid: admin.uid,
    name: admin.name ?? "Admin",
    photoUrl: admin.photoUrl ?? null,
    role: "admin",
    guestScore: admin.guestScore ?? 50,
    joinedAt: Timestamp.now(),
  };

  // ✅ NOTE: `name` and `nameLower` appear exactly ONCE each.
  // Do not add another `nameLower` line — that causes TS1117.
  const squadDoc = {
    name: draft.name.trim(),
    nameLower: draft.name.trim().toLowerCase(),
    description: draft.description.trim(),

    activity: draft.activity,
    activityCustom: draft.activityCustom || "",
    coverImageUrl: draft.coverImageUrl ?? null,

    adminUid: admin.uid,
    adminName: admin.name ?? "Admin",
    adminPhotoUrl: admin.photoUrl ?? null,

    memberUids: [admin.uid],
    memberDetails: [adminMember],
    coAdminUids: [],

    recurring: draft.recurringEnabled
      ? {
          enabled: true,
          dayOfWeek: draft.recurringDayOfWeek,
          time: draft.recurringTime,
        }
      : null,

    city: draft.city,
    chatId: `squad_${squadId}`,

    isActive: true,
    isArchived: false,

    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    plansGeneratedCount: 0,
  };

  await setDoc(newRef, squadDoc);

  // Create the empty chat doc so it's ready when messages arrive
  await setDoc(doc(db, "chats", `squad_${squadId}`), {
    type: "squad",
    squadId,
    participants: [admin.uid],
    createdAt: serverTimestamp(),
  });

  return squadId;
}

// ─────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────
export async function getSquad(squadId: string): Promise<Squad | null> {
  const snap = await getDoc(doc(db, "squads", squadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Squad;
}

export async function getMySquads(uid: string): Promise<Squad[]> {
  const q = query(
    collection(db, "squads"),
    where("memberUids", "array-contains", uid),
    where("isArchived", "==", false),
    orderBy("lastActivityAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Squad));
}

// ─────────────────────────────────────────────────────────
// Member management (Story 4.3)
// ─────────────────────────────────────────────────────────
export async function promoteToCoAdmin(
  squadId: string,
  targetUid: string
): Promise<void> {
  const squadRef = doc(db, "squads", squadId);
  const snap = await getDoc(squadRef);
  if (!snap.exists()) throw new Error("Squad not found");

  const squad = { id: snap.id, ...snap.data() } as Squad;

  const updatedMembers = squad.memberDetails.map((m) =>
    m.uid === targetUid ? { ...m, role: "co_admin" as const } : m
  );
  const coAdmins = Array.from(new Set([...squad.coAdminUids, targetUid]));

  await updateDoc(squadRef, {
    memberDetails: updatedMembers,
    coAdminUids: coAdmins,
    updatedAt: serverTimestamp(),
  });
}

export async function removeMember(
  squadId: string,
  targetUid: string,
  reason: string
): Promise<void> {
  const squadRef = doc(db, "squads", squadId);
  const snap = await getDoc(squadRef);
  if (!snap.exists()) throw new Error("Squad not found");

  const squad = { id: snap.id, ...snap.data() } as Squad;

  if (squad.adminUid === targetUid) {
    throw new Error("Cannot remove the admin. Fork or archive instead.");
  }

  const updatedMembers = squad.memberDetails.filter((m) => m.uid !== targetUid);
  const updatedUids = squad.memberUids.filter((u) => u !== targetUid);
  const updatedCoAdmins = squad.coAdminUids.filter((u) => u !== targetUid);

  await updateDoc(squadRef, {
    memberDetails: updatedMembers,
    memberUids: updatedUids,
    coAdminUids: updatedCoAdmins,
    updatedAt: serverTimestamp(),
  });

  // Log the removal for the appeal process
  const logsRef = collection(db, "squads", squadId, "memberLogs");
  await setDoc(doc(logsRef), {
    type: "removed",
    targetUid,
    removedByUid: squad.adminUid,
    reason,
    createdAt: serverTimestamp(),
  });
}

export async function leaveSquad(squadId: string, uid: string): Promise<void> {
  const squadRef = doc(db, "squads", squadId);
  const snap = await getDoc(squadRef);
  if (!snap.exists()) throw new Error("Squad not found");

  const squad = { id: snap.id, ...snap.data() } as Squad;

  // Admin leaving → promote co-admin or archive
  if (squad.adminUid === uid) {
    if (squad.coAdminUids.length > 0) {
      // Promote first co-admin
      const newAdminUid = squad.coAdminUids[0];
      const newAdminMember = squad.memberDetails.find((m) => m.uid === newAdminUid);
      if (!newAdminMember) throw new Error("Co-admin not found");

      const updatedMembers = squad.memberDetails
        .filter((m) => m.uid !== uid)
        .map((m) =>
          m.uid === newAdminUid ? { ...m, role: "admin" as const } : m
        );

      await updateDoc(squadRef, {
        adminUid: newAdminUid,
        adminName: newAdminMember.name,
        adminPhotoUrl: newAdminMember.photoUrl,
        memberUids: squad.memberUids.filter((u) => u !== uid),
        memberDetails: updatedMembers,
        coAdminUids: squad.coAdminUids.filter((u) => u !== newAdminUid),
        updatedAt: serverTimestamp(),
      });
    } else {
      // No co-admin → archive
      await updateDoc(squadRef, {
        isArchived: true,
        isActive: false,
        archivedReason: "Admin left with no co-admin",
        archivedAt: serverTimestamp(),
        memberUids: squad.memberUids.filter((u) => u !== uid),
        memberDetails: squad.memberDetails.filter((m) => m.uid !== uid),
        updatedAt: serverTimestamp(),
      });
    }
    return;
  }

  // Regular member leaving
  await updateDoc(squadRef, {
    memberUids: squad.memberUids.filter((u) => u !== uid),
    memberDetails: squad.memberDetails.filter((m) => m.uid !== uid),
    coAdminUids: squad.coAdminUids.filter((u) => u !== uid),
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Fork Squad (Story 4.4)
// ─────────────────────────────────────────────────────────
export async function forkSquad(
  squadId: string,
  forkerUid: string
): Promise<string> {
  const squadRef = doc(db, "squads", squadId);
  const snap = await getDoc(squadRef);
  if (!snap.exists()) throw new Error("Squad not found");

  const original = { id: snap.id, ...snap.data() } as Squad;

  // Forker must be a member
  if (!original.memberUids.includes(forkerUid)) {
    throw new Error("Only squad members can fork");
  }

  // Cannot fork if you're the admin (you'd just leave / archive instead)
  if (original.adminUid === forkerUid) {
    throw new Error("Admin cannot fork — archive or transfer instead");
  }

  const forkerMember = original.memberDetails.find((m) => m.uid === forkerUid);
  if (!forkerMember) throw new Error("Member record not found");

  const squadsRef = collection(db, "squads");
  const newRef = doc(squadsRef);
  const newSquadId = newRef.id;

  // New members = all original members minus the original admin
  const newMembers = original.memberDetails
    .filter((m) => m.uid !== original.adminUid)
    .map((m) => ({
      ...m,
      role: (m.uid === forkerUid ? "admin" : m.role === "admin" ? "member" : m.role) as
        | "admin"
        | "co_admin"
        | "member",
    }));

  const newMemberUids = newMembers.map((m) => m.uid);
  const newCoAdmins = newMembers
    .filter((m) => m.role === "co_admin")
    .map((m) => m.uid);

  const forkedDoc = {
    name: `${original.name} (Fork)`,
    description: original.description,

    activity: original.activity,
    activityCustom: original.activityCustom ?? "",
    coverImageUrl: original.coverImageUrl,

    adminUid: forkerUid,
    adminName: forkerMember.name,
    adminPhotoUrl: forkerMember.photoUrl,

    memberUids: newMemberUids,
    memberDetails: newMembers,
    coAdminUids: newCoAdmins,

    recurring: original.recurring,
    city: original.city,
    chatId: `squad_${newSquadId}`,

    isActive: true,
    isArchived: false,

    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    plansGeneratedCount: 0,
    forkedFrom: squadId,
    forkedAt: serverTimestamp(),
    forkedBy: forkerUid,
  };

  await setDoc(newRef, forkedDoc);

  // Archive the original
  await updateDoc(squadRef, {
    isActive: false,
    isArchived: true,
    archivedReason: `Forked by member ${forkerUid}`,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create chat for the new squad
  await setDoc(doc(db, "chats", `squad_${newSquadId}`), {
    type: "squad",
    squadId: newSquadId,
    participants: newMemberUids,
    createdAt: serverTimestamp(),
  });

  // Log the fork for moderator review
  const logsRef = collection(db, "squads", squadId, "memberLogs");
  await setDoc(doc(logsRef), {
    type: "forked",
    forkedBy: forkerUid,
    newSquadId,
    createdAt: serverTimestamp(),
  });

  return newSquadId;
}

// ─────────────────────────────────────────────────────────
// Archive (used when squad has no active members)
// ─────────────────────────────────────────────────────────
export async function archiveSquad(
  squadId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, "squads", squadId), {
    isActive: false,
    isArchived: true,
    archivedReason: reason,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Helper — check role
// ─────────────────────────────────────────────────────────
export function getSquadRole(
  squad: Squad,
  uid: string
): "admin" | "co_admin" | "member" | "visitor" {
  if (squad.adminUid === uid) return "admin";
  if (squad.coAdminUids.includes(uid)) return "co_admin";
  if (squad.memberUids.includes(uid)) return "member";
  return "visitor";
}