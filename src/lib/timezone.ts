// src/lib/timezone.ts
import {
  AvailabilityMap,
  DayKey,
  TimeBlockKey,
  TimeBlockRange,
  TimeBlockRanges,
} from "../types/user";
import {
  DAYS,
  TIME_BLOCKS,
  cellKey,
  getBlockRange,
} from "../constants/weeklyAvailability";

/**
 * Check if a normalized hour (0–23) falls within a range.
 * Handles ranges that wrap past midnight (e.g. Night 21 → 6).
 */
function hourInRange(hour: number, range: TimeBlockRange): boolean {
  const h = ((hour % 24) + 24) % 24;
  if (range.startHour <= range.endHour) {
    return h >= range.startHour && h < range.endHour;
  }
  // wraps midnight
  return h >= range.startHour || h < range.endHour;
}

/**
 * Convert a local (day, block) into its UTC hour range.
 */
export function localBlockToUtcHours(
  day: DayKey,
  block: TimeBlockKey,
  utcOffsetMinutes: number,
  ranges?: TimeBlockRanges
): { startUtcHour: number; endUtcHour: number; utcDayShift: number } {
  const dayDef = DAYS.find((d) => d.key === day);
  const blockDef = TIME_BLOCKS.find((b) => b.key === block);
  if (!dayDef || !blockDef) {
    return { startUtcHour: 0, endUtcHour: 0, utcDayShift: 0 };
  }

  const effectiveRange = getBlockRange(ranges, block);
  const offsetHours = utcOffsetMinutes / 60;

  const startUtc = effectiveRange.startHour - offsetHours;
  const endUtc = effectiveRange.endHour - offsetHours;

  let utcDayShift = 0;
  let startUtcHour = startUtc;
  let endUtcHour = endUtc;

  if (startUtcHour < 0) {
    startUtcHour += 24;
    utcDayShift -= 1;
  } else if (startUtcHour >= 24) {
    startUtcHour -= 24;
    utcDayShift += 1;
  }

  if (endUtcHour < 0) {
    endUtcHour += 24;
  } else if (endUtcHour >= 24) {
    endUtcHour -= 24;
  }

  return { startUtcHour, endUtcHour, utcDayShift };
}

/**
 * Remap availability from source timezone to viewer timezone.
 */
export function remapAvailabilityToViewer(
  source: AvailabilityMap,
  sourceOffsetMinutes: number,
  viewerOffsetMinutes: number,
  sourceRanges?: TimeBlockRanges,
  viewerRanges?: TimeBlockRanges
): AvailabilityMap {
  const deltaMinutes = viewerOffsetMinutes - sourceOffsetMinutes;
  if (deltaMinutes === 0) return source;

  const result: AvailabilityMap = {};

  for (const [key, status] of Object.entries(source)) {
    if (!status) continue;

    const [day, block] = key.split("_") as [DayKey, TimeBlockKey];
    const dayDef = DAYS.find((d) => d.key === day);
    const blockDef = TIME_BLOCKS.find((b) => b.key === block);
    if (!dayDef || !blockDef) continue;

    const srcRange = getBlockRange(sourceRanges, block);
    const localStartHour = srcRange.startHour + deltaMinutes / 60;
    const localEndHour = srcRange.endHour + deltaMinutes / 60;

    const midpoint = (localStartHour + localEndHour) / 2;
    const normalizedMid = ((midpoint % 24) + 24) % 24;

    const viewerBlock = TIME_BLOCKS.find((b) => {
      const vRange = getBlockRange(viewerRanges, b.key);
      return hourInRange(normalizedMid, vRange);
    });

    if (!viewerBlock) continue;

    let dayShift = 0;
    if (midpoint < 0) dayShift = -1;
    else if (midpoint >= 24) dayShift = 1;

    const viewerDayIndex = (dayDef.jsDayIndex + dayShift + 7) % 7;
    const viewerDay = DAYS.find((d) => d.jsDayIndex === viewerDayIndex);
    if (!viewerDay) continue;

    const viewerKey = cellKey(viewerDay.key, viewerBlock.key);
    if (!result[viewerKey] || result[viewerKey] === "maybe") {
      result[viewerKey] = status;
    }
  }

  return result;
}

/**
 * Task 3: Given a UTC Timestamp/Date and the organizer's effective
 * block ranges, find which (day, block) it belongs to in the
 * organizer's local time.
 */
export function findBlockForTimestamp(
  timestamp: { toDate: () => Date } | Date,
  organizerRanges?: TimeBlockRanges
): { day: DayKey; block: TimeBlockKey } | null {
  const date =
    timestamp instanceof Date ? timestamp : timestamp.toDate();
  const jsDay = date.getDay(); 
  const hour = date.getHours(); 

  const dayDef = DAYS.find((d) => d.jsDayIndex === jsDay);
  if (!dayDef) return null;

  const block = TIME_BLOCKS.find((b) => {
    const range = getBlockRange(organizerRanges, b.key);
    return hourInRange(hour, range);
  });

  if (!block) return null;
  return { day: dayDef.key, block: block.key };
}