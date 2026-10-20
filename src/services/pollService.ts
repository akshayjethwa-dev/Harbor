// src/services/pollService.ts
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import {
  DatePoll,
  PollSlot,
  PollStatus,
  VoteChoice,
  VoteDoc,
  POLL_DURATION_DAYS,
  NudgeRecord,
} from "../types/poll";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const POLLS = "polls";
const VOTES = "votes";

// ─────────────────────────────────────────────
// Create poll
// ─────────────────────────────────────────────
export interface CreatePollInput {
  planId: string;
  organizerId: string;
  slots: Omit<PollSlot, "id">[];
  timezone: string;
}

export async function createDatePoll(
  input: CreatePollInput
): Promise<string> {
  if (input.slots.length < 3 || input.slots.length > 5) {
    throw new Error("A poll must have between 3 and 5 slots.");
  }

  const slots: PollSlot[] = input.slots.map((s, i) => ({
    id: `slot_${i + 1}`,
    startAt: s.startAt,
    endAt: s.endAt,
  }));

  const now = Timestamp.now();
  const closesAt = Timestamp.fromMillis(
    now.toMillis() + POLL_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const voteCounts: Record<string, { yes: number; maybe: number; no: number }> = {};
  for (const s of slots) {
    voteCounts[s.id] = { yes: 0, maybe: 0, no: 0 };
  }

  const pollData = {
    planId: input.planId,
    organizerId: input.organizerId,
    status: "open" as PollStatus,
    slots,
    voteCounts,
    confirmedSlotId: null,
    createdAt: serverTimestamp(),
    closesAt,
    closedAt: null,
    timezone: input.timezone,
  };

  const ref = await addDoc(collection(db, POLLS), pollData);

  await updateDoc(doc(db, "plans", input.planId), {
    pendingDatePollId: ref.id,
    dateStatus: "pending",
  });

  return ref.id;
}

// ─────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────
export async function getPoll(pollId: string): Promise<DatePoll | null> {
  const snap = await getDoc(doc(db, POLLS, pollId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<DatePoll, "id">) };
}

export async function listPollsForPlan(planId: string): Promise<DatePoll[]> {
  const q = query(
    collection(db, POLLS),
    where("planId", "==", planId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<DatePoll, "id">),
  }));
}

export function subscribeToPoll(
  pollId: string,
  callback: (poll: DatePoll | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, POLLS, pollId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...(snap.data() as Omit<DatePoll, "id">) });
  });
}

export function subscribeToUserVote(
  pollId: string,
  userId: string,
  callback: (votes: Record<string, VoteChoice> | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, POLLS, pollId, VOTES, userId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback((snap.data() as VoteDoc).votes ?? {});
    }
  );
}

// ─────────────────────────────────────────────
// Vote
// ─────────────────────────────────────────────
export async function castVote(
  pollId: string,
  userId: string,
  slotId: string,
  choice: VoteChoice
): Promise<void> {
  const pollRef = doc(db, POLLS, pollId);
  const voteRef = doc(db, POLLS, pollId, VOTES, userId);

  await runTransaction(db, async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists()) throw new Error("Poll not found.");
    const poll = pollSnap.data() as Omit<DatePoll, "id">;

    if (poll.status !== "open") {
      throw new Error("This poll is no longer open.");
    }

    const voteSnap = await tx.get(voteRef);
    const existing: VoteDoc = voteSnap.exists()
      ? (voteSnap.data() as VoteDoc)
      : { userId, votes: {}, updatedAt: Timestamp.now() };

    const prevChoice = existing.votes[slotId];
    if (prevChoice === choice) return;

    const counts = { ...(poll.voteCounts ?? {}) };
    const slotCounts = { ...(counts[slotId] ?? { yes: 0, maybe: 0, no: 0 }) };

    if (prevChoice) {
      slotCounts[prevChoice] = Math.max(0, slotCounts[prevChoice] - 1);
    }
    slotCounts[choice] = slotCounts[choice] + 1;
    counts[slotId] = slotCounts;

    tx.set(voteRef, {
      userId,
      votes: { ...existing.votes, [slotId]: choice },
      updatedAt: serverTimestamp(),
    });

    tx.update(pollRef, { voteCounts: counts });
  });
}

// ─────────────────────────────────────────────
// Confirm / Close / Reopen
// ─────────────────────────────────────────────
export async function confirmSlot(
  pollId: string,
  slotId: string,
  organizerId: string,
  overrideReason?: string
): Promise<{ planId: string; startAt: Timestamp; endAt: Timestamp }> {
  const pollRef = doc(db, POLLS, pollId);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(pollRef);
    if (!snap.exists()) throw new Error("Poll not found.");
    const poll = snap.data() as Omit<DatePoll, "id">;

    if (poll.organizerId !== organizerId) {
      throw new Error("Only the organizer can confirm a slot.");
    }
    if (poll.status !== "open") {
      throw new Error("This poll is already closed.");
    }

    const slot = poll.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error("Slot not found.");

    tx.update(pollRef, {
      status: "closed",
      confirmedSlotId: slotId,
      closedAt: serverTimestamp(),
    });

    const planRef = doc(db, "plans", poll.planId);
    const planUpdate: any = {
      startTime: slot.startAt,
      endTime: slot.endAt,
      dateStatus: "confirmed",
      pendingDatePollId: null,
    };
    
    if (overrideReason) {
      planUpdate.dateOverrideReason = overrideReason;
    }

    tx.update(planRef, planUpdate);

    return {
      planId: poll.planId,
      startAt: slot.startAt,
      endAt: slot.endAt,
    };
  });

  return result;
}

export async function closePoll(
  pollId: string,
  organizerId: string
): Promise<void> {
  const pollRef = doc(db, POLLS, pollId);
  const snap = await getDoc(pollRef);
  if (!snap.exists()) throw new Error("Poll not found.");
  const poll = snap.data() as Omit<DatePoll, "id">;
  if (poll.organizerId !== organizerId) {
    throw new Error("Only the organizer can close the poll.");
  }
  await updateDoc(pollRef, {
    status: "closed",
    closedAt: serverTimestamp(),
  });
  if (!poll.confirmedSlotId) {
    await updateDoc(doc(db, "plans", poll.planId), {
      pendingDatePollId: null,
      dateStatus: "pending",
    });
  }
}

export async function reopenPoll(
  pollId: string,
  organizerId: string
): Promise<void> {
  const pollRef = doc(db, POLLS, pollId);
  const snap = await getDoc(pollRef);
  if (!snap.exists()) throw new Error("Poll not found.");
  
  const poll = snap.data() as Omit<DatePoll, "id">;
  if (poll.organizerId !== organizerId) {
    throw new Error("Only the organizer can re-open the poll.");
  }

  const newClosesAt = Timestamp.fromMillis(
    Date.now() + 3 * 24 * 60 * 60 * 1000
  );

  await updateDoc(pollRef, {
    status: "open",
    confirmedSlotId: null,
    closedAt: null,
    closesAt: newClosesAt,
  });

  await updateDoc(doc(db, "plans", poll.planId), {
    pendingDatePollId: pollId,
    dateStatus: "pending",
  });
}

export async function expireIfPast(poll: DatePoll): Promise<boolean> {
  if (poll.status !== "open") return false;
  const now = Date.now();
  if (poll.closesAt.toMillis() > now) return false;

  const totalVotes = Object.values(poll.voteCounts ?? {}).reduce(
    (sum, c) => sum + c.yes + c.maybe + c.no,
    0
  );

  await updateDoc(doc(db, POLLS, poll.id), {
    status: "expired",
    closedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "plans", poll.planId), {
    pendingDatePollId: null,
    dateStatus: "pending",
  });

  return totalVotes === 0;
}

// ─────────────────────────────────────────────
// Task 5: Nudges
// ─────────────────────────────────────────────
export async function sendNudge(
  pollId: string,
  targetUid: string,
  organizerId: string
): Promise<void> {
  await addDoc(collection(db, "nudgeRequests"), {
    pollId,
    targetUid,
    organizerId,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToNudges(
  pollId: string,
  callback: (nudges: Record<string, NudgeRecord>) => void
): Unsubscribe {
  const nudgesRef = collection(db, POLLS, pollId, "nudges");
  return onSnapshot(nudgesRef, (snap) => {
    const nudges: Record<string, NudgeRecord> = {};
    snap.forEach((doc) => {
      const data = doc.data() as NudgeRecord;
      nudges[data.userId] = data;
    });
    callback(nudges);
  });
}

export async function getPollVotes(pollId: string): Promise<string[]> {
  const votesRef = collection(db, POLLS, pollId, VOTES);
  const snap = await getDocs(votesRef);
  return snap.docs.map((d) => d.id);
}