// src/types/poll.ts
import { Timestamp } from "firebase/firestore";

export type PollStatus = "open" | "closed" | "expired";
export type VoteChoice = "yes" | "maybe" | "no";

export interface PollSlot {
  /** Short id, unique within the poll (e.g. "slot_1"). */
  id: string;
  /** UTC start time. */
  startAt: Timestamp;
  /** UTC end time. */
  endAt: Timestamp;
}

export interface VoteCounts {
  yes: number;
  maybe: number;
  no: number;
}

export interface DatePoll {
  id: string;
  planId: string;
  organizerId: string;
  status: PollStatus;
  slots: PollSlot[];
  /** Denormalized tally keyed by slot id. */
  voteCounts: Record<string, VoteCounts>;
  confirmedSlotId: string | null;
  createdAt: Timestamp;
  closesAt: Timestamp;
  closedAt: Timestamp | null;
  /** Creator's IANA timezone at creation. */
  timezone: string;
}

export interface VoteDoc {
  userId: string;
  votes: Record<string, VoteChoice>;
  updatedAt: Timestamp;
}

/** Slot count guardrails. */
export const MIN_POLL_SLOTS = 3;
export const MAX_POLL_SLOTS = 5;
export const POLL_DURATION_DAYS = 7;

/** A slot is flagged when "no" exceeds yes+maybe. */
export function isRejected(counts: VoteCounts | undefined): boolean {
  if (!counts) return false;
  const total = counts.yes + counts.maybe + counts.no;
  return total > 0 && counts.no > counts.yes + counts.maybe;
}

/**
 * Determine if the organizer should be prompted to create a new poll.
 * True when: at least one vote exists AND every slot is rejected.
 */
export function shouldRecreatePoll(
  slots: PollSlot[],
  voteCounts: Record<string, VoteCounts>
): boolean {
  const totalVotes = Object.values(voteCounts).reduce(
    (sum, c) => sum + c.yes + c.maybe + c.no,
    0
  );
  if (totalVotes === 0) return false;
  return slots.every((s) => isRejected(voteCounts[s.id]));
}

// ─────────────────────────────────────────────
// Task 3: Availability Heatmap Types
// ─────────────────────────────────────────────
export type HeatmapStatus =
  | "all_free"        // 🟢 all known members are free/maybe
  | "some_conflicts"  // 🟡 some are busy, some are free
  | "major_conflicts" // 🔴 majority busy
  | "unknown";        // ⚪ all members are unknown

export interface SlotHeatmapMember {
  uid: string;
  name: string;
  photoUrl: string | null;
  status: "free" | "busy" | "maybe" | "unknown";
}

export interface SlotHeatmapDetail {
  status: HeatmapStatus;
  free: SlotHeatmapMember[];
  maybe: SlotHeatmapMember[];
  busy: SlotHeatmapMember[];
  unknown: SlotHeatmapMember[];
  /** Total known (free + maybe + busy). */
  known: number;
  /** Total members in the plan. */
  total: number;
}

// ─────────────────────────────────────────────
// Task 4: Consensus & Recommendations
// ─────────────────────────────────────────────

/**
 * Calculates the consensus score for a slot.
 * Formula: (Yes * 2 + Maybe * 1) / Total Members
 */
export function getConsensusScore(
  slotId: string,
  voteCounts: Record<string, VoteCounts>,
  totalMembers: number
): number {
  if (totalMembers === 0) return 0;
  const counts = voteCounts[slotId] || { yes: 0, maybe: 0, no: 0 };
  return (counts.yes * 2 + counts.maybe * 1) / totalMembers;
}

/**
 * Finds the recommended slot(s). Handles ties by keeping all top-scoring
 * slots, but naturally favors the earliest one because we iterate
 * chronologically.
 */
export function getRecommendedSlotIds(
  slots: PollSlot[],
  voteCounts: Record<string, VoteCounts>,
  totalMembers: number
): string[] {
  if (slots.length === 0 || totalMembers === 0) return [];

  let bestScore = -1;
  const winners: string[] = [];

  // Sort chronologically to ensure "earliest slot wins" tie-breaking
  const sortedSlots = [...slots].sort(
    (a, b) => a.startAt.toMillis() - b.startAt.toMillis()
  );

  for (const slot of sortedSlots) {
    const score = getConsensusScore(slot.id, voteCounts, totalMembers);
    
    // We only want to recommend slots that have *some* positive consensus
    if (score <= 0) continue;

    if (score > bestScore) {
      bestScore = score;
      winners.length = 0; // reset previous winners
      winners.push(slot.id);
    } else if (score === bestScore) {
      winners.push(slot.id);
    }
  }
  return winners;
}

/**
 * Returns true if the "No" votes exceed 50% of total members.
 */
export function isMajorityNo(
  slotId: string,
  voteCounts: Record<string, VoteCounts>,
  totalMembers: number
): boolean {
  if (totalMembers === 0) return false;
  const counts = voteCounts[slotId] || { yes: 0, maybe: 0, no: 0 };
  return counts.no > totalMembers / 2;
}

// ─────────────────────────────────────────────
// Task 5: Nudge Non-Voters
// ─────────────────────────────────────────────
export interface NudgeRecord {
  /** The user who was nudged. */
  userId: string;
  /** When the nudge was sent. */
  sentAt: Timestamp;
  /** The organizer who triggered it. */
  sentBy: string;
}