// src/constants/weeklyAvailability.ts
import {
  AvailabilityStatus,
  DayKey,
  TimeBlockKey,
  AvailabilityMap,
  TimeBlockRange,
  TimeBlockRanges,
} from "../types/user";

export interface DayDefinition {
  key: DayKey;
  label: string;
  shortLabel: string;
  jsDayIndex: number; // 0 = Sunday … 6 = Saturday
}

export interface TimeBlockDefinition {
  key: TimeBlockKey;
  label: string;
  icon: string;
  /** Default hours when the user hasn't customized. */
  defaultRange: TimeBlockRange;
}

export const DAYS: DayDefinition[] = [
  { key: "mon", label: "Monday", shortLabel: "Mon", jsDayIndex: 1 },
  { key: "tue", label: "Tuesday", shortLabel: "Tue", jsDayIndex: 2 },
  { key: "wed", label: "Wednesday", shortLabel: "Wed", jsDayIndex: 3 },
  { key: "thu", label: "Thursday", shortLabel: "Thu", jsDayIndex: 4 },
  { key: "fri", label: "Friday", shortLabel: "Fri", jsDayIndex: 5 },
  { key: "sat", label: "Saturday", shortLabel: "Sat", jsDayIndex: 6 },
  { key: "sun", label: "Sunday", shortLabel: "Sun", jsDayIndex: 0 },
];

export const TIME_BLOCKS: TimeBlockDefinition[] = [
  { key: "morning", label: "Morning", icon: "🌅", defaultRange: { startHour: 6, endHour: 12 } },
  { key: "afternoon", label: "Afternoon", icon: "☀️", defaultRange: { startHour: 12, endHour: 17 } },
  { key: "evening", label: "Evening", icon: "🌆", defaultRange: { startHour: 17, endHour: 21 } },
  { key: "night", label: "Night", icon: "🌙", defaultRange: { startHour: 21, endHour: 6 } },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Resolve the effective range for a block, using the user's override
 * if present, otherwise the default.
 */
export function getBlockRange(
  ranges: TimeBlockRanges | undefined,
  blockKey: TimeBlockKey
): TimeBlockRange {
  const custom = ranges?.[blockKey];
  if (custom) return custom;
  const def = TIME_BLOCKS.find((b) => b.key === blockKey);
  return def?.defaultRange ?? { startHour: 0, endHour: 0 };
}

/** Format an hour (0–23) as a compact 12-hour string, e.g. "6 AM", "12 PM". */
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Compact range for tight UI: "6a – 12p" */
export function formatRangeCompact(range: TimeBlockRange): string {
  const fmt = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    if (hh === 0) return "12a";
    if (hh === 12) return "12p";
    return hh < 12 ? `${hh}a` : `${hh - 12}p`;
  };
  return `${fmt(range.startHour)} – ${fmt(range.endHour)}`;
}

/** Full range for the settings list: "6:00 AM – 12:00 PM" */
export function formatRangeFull(range: TimeBlockRange): string {
  return `${formatHour(range.startHour)} – ${formatHour(range.endHour)}`;
}

/** Returns true if the range wraps past midnight (e.g. Night 21 → 6). */
export function isOvernight(range: TimeBlockRange): boolean {
  return range.startHour >= range.endHour;
}

/** Check whether this range is equal to the block's default range. */
export function isDefaultRange(
  ranges: TimeBlockRanges | undefined,
  blockKey: TimeBlockKey
): boolean {
  const custom = ranges?.[blockKey];
  if (!custom) return true;
  const def = TIME_BLOCKS.find((b) => b.key === blockKey)?.defaultRange;
  if (!def) return true;
  return custom.startHour === def.startHour && custom.endHour === def.endHour;
}

// ─────────────────────────────────────────────
// Status configuration
// ─────────────────────────────────────────────
export interface StatusConfig {
  value: AvailabilityStatus;
  label: string;
  shortLabel: string;
  icon: string;
  colorToken: "success" | "danger" | "warning";
}

export const STATUSES: StatusConfig[] = [
  { value: "free", label: "Free", shortLabel: "F", icon: "✓", colorToken: "success" },
  { value: "busy", label: "Busy", shortLabel: "B", icon: "✕", colorToken: "danger" },
  { value: "maybe", label: "Maybe", shortLabel: "?", icon: "~", colorToken: "warning" },
];

/** Cycle order when tapping a cell: unknown → free → busy → maybe → unknown */
export const STATUS_CYCLE: (AvailabilityStatus | undefined)[] = [
  undefined,
  "free",
  "busy",
  "maybe",
];

export function nextStatus(
  current: AvailabilityStatus | undefined
): AvailabilityStatus | undefined {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

export function cellKey(
  day: DayKey,
  block: TimeBlockKey
): `${DayKey}_${TimeBlockKey}` {
  return `${day}_${block}`;
}

export function countSetCells(map: AvailabilityMap | undefined): number {
  if (!map) return 0;
  return Object.values(map).filter(Boolean).length;
}

export function isAvailabilityEmpty(map: AvailabilityMap | undefined): boolean {
  return countSetCells(map) === 0;
}

export type { AvailabilityMap, TimeBlockRange, TimeBlockRanges } from "../types/user";