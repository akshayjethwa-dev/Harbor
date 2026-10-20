// src/hooks/useSquadAvailability.ts
import { useCallback, useState } from "react";
import { GarbaCrewUser, TimeBlockRanges } from "../types/user";
import {
  DatePoll,
  PollSlot,
  HeatmapStatus,
  SlotHeatmapDetail,
  SlotHeatmapMember,
} from "../types/poll";
import { getUsersByIds } from "../services/userService";
import { cellKey } from "../constants/weeklyAvailability";
import {
  findBlockForTimestamp,
  remapAvailabilityToViewer,
} from "../lib/timezone";

function computeSlotDetail(
  slot: PollSlot,
  members: GarbaCrewUser[],
  organizerOffsetMinutes: number,
  organizerRanges: TimeBlockRanges | undefined
): SlotHeatmapDetail {
  const free: SlotHeatmapMember[] = [];
  const maybe: SlotHeatmapMember[] = [];
  const busy: SlotHeatmapMember[] = [];
  const unknown: SlotHeatmapMember[] = [];

  const mapped = findBlockForTimestamp(slot.startAt, organizerRanges);

  for (const m of members) {
    const base: Omit<SlotHeatmapMember, "status"> = {
      uid: m.uid,
      name: m.name ?? "Unknown",
      photoUrl: m.photoUrl ?? null,
    };

    if (!m.availability || Object.keys(m.availability).length === 0) {
      unknown.push({ ...base, status: "unknown" });
      continue;
    }

    if (!mapped) {
      unknown.push({ ...base, status: "unknown" });
      continue;
    }

    const memberOffset = m.availabilityUtcOffsetMinutes ?? 0;
    const remapped = remapAvailabilityToViewer(
      m.availability,
      memberOffset,
      organizerOffsetMinutes,
      m.timeBlockRanges,
      organizerRanges
    );

    const status = remapped[cellKey(mapped.day, mapped.block)];
    if (status === "free") free.push({ ...base, status: "free" });
    else if (status === "busy") busy.push({ ...base, status: "busy" });
    else if (status === "maybe") maybe.push({ ...base, status: "maybe" });
    else unknown.push({ ...base, status: "unknown" });
  }

  const known = free.length + maybe.length + busy.length;
  let heatmapStatus: HeatmapStatus;
  if (known === 0) {
    heatmapStatus = "unknown";
  } else {
    const busyRatio = busy.length / known;
    if (busyRatio >= 0.5) heatmapStatus = "major_conflicts";
    else if (busy.length === 0) heatmapStatus = "all_free";
    else heatmapStatus = "some_conflicts";
  }

  return {
    status: heatmapStatus,
    free,
    maybe,
    busy,
    unknown,
    known,
    total: members.length,
  };
}

export interface UseSquadAvailabilityReturn {
  members: GarbaCrewUser[];
  loading: boolean;
  error: string | null;
  load: (uids: string[]) => Promise<void>;
  computeHeatmap: (
    poll: DatePoll,
    organizerOffsetMinutes: number,
    organizerRanges: TimeBlockRanges | undefined
  ) => Record<string, SlotHeatmapDetail>;
}

export function useSquadAvailability(): UseSquadAvailabilityReturn {
  const [members, setMembers] = useState<GarbaCrewUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (uids: string[]) => {
    if (!uids || uids.length === 0) {
      setMembers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const users = await getUsersByIds(uids);
      setMembers(users);
    } catch (e: any) {
      console.error("useSquadAvailability load failed:", e);
      setError(e?.message ?? "Could not load squad availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  const computeHeatmap = useCallback(
    (
      poll: DatePoll,
      organizerOffsetMinutes: number,
      organizerRanges: TimeBlockRanges | undefined
    ): Record<string, SlotHeatmapDetail> => {
      const result: Record<string, SlotHeatmapDetail> = {};
      for (const slot of poll.slots) {
        result[slot.id] = computeSlotDetail(
          slot,
          members,
          organizerOffsetMinutes,
          organizerRanges
        );
      }
      return result;
    },
    [members]
  );

  return {
    members,
    loading,
    error,
    load,
    computeHeatmap,
  };
}