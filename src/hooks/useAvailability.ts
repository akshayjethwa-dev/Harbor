// src/hooks/useAvailability.ts
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  AvailabilityMap,
  AvailabilityStatus,
  DayKey,
  TimeBlockKey,
  TimeBlockRange,
  TimeBlockRanges,
} from "../types/user";
import {
  cellKey,
  isAvailabilityEmpty,
  nextStatus,
  TIME_BLOCKS,
  getBlockRange,
} from "../constants/weeklyAvailability";
import {
  updateUserAvailability,
  clearUserAvailability,
} from "../services/userService";

// ─────────────────────────────────────────────
// Timezone helpers
// ─────────────────────────────────────────────
function getIanaTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function useAvailability() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Draft availability map ──
  const [draft, setDraft] = useState<AvailabilityMap>(
    () => user?.availability ?? {}
  );

  // ── Draft time-block ranges ──
  const [draftRanges, setDraftRanges] = useState<TimeBlockRanges>(
    () => user?.timeBlockRanges ?? {}
  );

  const remoteMap = user?.availability;
  const remoteRanges = user?.timeBlockRanges;

  useMemo(() => {
    if (remoteMap) setDraft({ ...remoteMap });
  }, [remoteMap]);

  useMemo(() => {
    if (remoteRanges) setDraftRanges({ ...remoteRanges });
  }, [remoteRanges]);

  const isDirty = useMemo(() => {
    const a = JSON.stringify(draft ?? {});
    const b = JSON.stringify(user?.availability ?? {});
    const r1 = JSON.stringify(draftRanges ?? {});
    const r2 = JSON.stringify(user?.timeBlockRanges ?? {});
    return a !== b || r1 !== r2;
  }, [draft, draftRanges, user?.availability, user?.timeBlockRanges]);

  const isEmpty = useMemo(() => isAvailabilityEmpty(draft), [draft]);

  // ── Toggle a single cell ──
  const toggleCell = useCallback((day: DayKey, block: TimeBlockKey) => {
    setDraft((prev) => {
      const key = cellKey(day, block);
      const next = nextStatus(prev?.[key]);
      const copy = { ...prev };
      if (next === undefined) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }, []);

  // ── Explicitly set a cell ──
  const setCell = useCallback(
    (
      day: DayKey,
      block: TimeBlockKey,
      status: AvailabilityStatus | undefined
    ) => {
      setDraft((prev) => {
        const key = cellKey(day, block);
        const copy = { ...prev };
        if (status === undefined) delete copy[key];
        else copy[key] = status;
        return copy;
      });
    },
    []
  );

  // ── Time-block range edits ──
  const setBlockRange = useCallback(
    (block: TimeBlockKey, range: TimeBlockRange) => {
      setDraftRanges((prev) => ({ ...prev, [block]: range }));
    },
    []
  );

  const resetBlockRange = useCallback((block: TimeBlockKey) => {
    setDraftRanges((prev) => {
      const copy = { ...prev };
      delete copy[block];
      return copy;
    });
  }, []);

  const resetAllBlockRanges = useCallback(() => {
    setDraftRanges({});
  }, []);

  /** Get the effective range for a block (custom or default). */
  const getEffectiveRange = useCallback(
    (block: TimeBlockKey): TimeBlockRange => getBlockRange(draftRanges, block),
    [draftRanges]
  );

  // ── Clear all availability (local) ──
  const clearAll = useCallback(() => {
    setDraft({});
  }, []);

  // ── Save to Firestore ──
  const save = useCallback(async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    try {
      await updateUserAvailability(
        user.uid,
        draft ?? {},
        draftRanges ?? {},
        getIanaTimezone(),
        getUtcOffsetMinutes()
      );
    } catch (e: any) {
      console.error("Failed to save availability:", e);
      setError(e?.message ?? "Failed to save availability.");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [user?.uid, draft, draftRanges]);

  // ── Clear remote ──
  const clearRemote = useCallback(async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    try {
      await clearUserAvailability(user.uid);
      setDraft({});
    } catch (e: any) {
      console.error("Failed to clear availability:", e);
      setError(e?.message ?? "Failed to clear availability.");
      throw e;
    } finally {
      setSaving(false);
    }
  }, [user?.uid]);

  // ── Reset draft to remote ──
  const reset = useCallback(() => {
    setDraft({ ...(user?.availability ?? {}) });
    setDraftRanges({ ...(user?.timeBlockRanges ?? {}) });
  }, [user?.availability, user?.timeBlockRanges]);

  const hasSavedAvailability = useMemo(() => {
    return !isAvailabilityEmpty(user?.availability);
  }, [user?.availability]);

  return {
    draft: draft ?? {},
    draftRanges: draftRanges ?? {},
    isDirty,
    isEmpty,
    hasSavedAvailability,
    save,
    clearRemote,
    reset,
    toggleCell,
    setCell,
    setBlockRange,
    resetBlockRange,
    resetAllBlockRanges,
    getEffectiveRange,
    clearAll,
    saving,
    error,
  };
}