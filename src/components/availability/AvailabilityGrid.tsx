// src/components/availability/AvailabilityGrid.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  DAYS,
  TIME_BLOCKS,
  STATUSES,
  cellKey,
  formatRangeCompact,
} from "../../constants/weeklyAvailability";
import {
  AvailabilityMap,
  AvailabilityStatus,
  DayKey,
  TimeBlockKey,
  TimeBlockRanges,
} from "../../types/user";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface AvailabilityGridProps {
  availability: AvailabilityMap;
  ranges?: TimeBlockRanges;
  onToggle: (day: DayKey, block: TimeBlockKey) => void;
  onSet?: (
    day: DayKey,
    block: TimeBlockKey,
    status: AvailabilityStatus | undefined
  ) => void;
  disabled?: boolean;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.bgElevated,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    cornerCell: {
      width: 78,
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
    },
    dayHeaderText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: "row",
      marginBottom: 6,
    },
    blockLabelCell: {
      width: 78,
      justifyContent: "center",
      paddingRight: 6,
    },
    blockLabelIcon: {
      fontSize: 16,
      marginBottom: 1,
    },
    blockLabelText: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    blockLabelTime: {
      fontSize: 9,
      fontWeight: "600",
      color: c.textMuted,
      marginTop: 1,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      marginHorizontal: 2,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgSubtle,
    },
    cellFree: {
      backgroundColor: c.success + "22",
      borderColor: c.success,
    },
    cellBusy: {
      backgroundColor: c.danger + "22",
      borderColor: c.danger,
    },
    cellMaybe: {
      backgroundColor: c.warning + "22",
      borderColor: c.warning,
    },
    cellUnknown: {
      backgroundColor: c.bgSubtle,
      borderColor: c.border,
    },
    cellText: {
      fontSize: 16,
      fontWeight: "800",
    },
    cellTextFree: { color: c.success },
    cellTextBusy: { color: c.danger },
    cellTextMaybe: { color: c.warning },
    cellTextUnknown: { color: c.textMuted, fontSize: 12 },
    legendRow: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    legendLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "600",
    },
  });

export default function AvailabilityGrid({
  availability,
  ranges,
  onToggle,
  onSet,
  disabled = false,
}: AvailabilityGridProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const cellStyle = useMemo(() => {
    return (status: AvailabilityStatus | undefined) => {
      switch (status) {
        case "free":
          return styles.cellFree;
        case "busy":
          return styles.cellBusy;
        case "maybe":
          return styles.cellMaybe;
        default:
          return styles.cellUnknown;
      }
    };
  }, [styles]);

  const cellTextStyle = useMemo(() => {
    return (status: AvailabilityStatus | undefined) => {
      switch (status) {
        case "free":
          return styles.cellTextFree;
        case "busy":
          return styles.cellTextBusy;
        case "maybe":
          return styles.cellTextMaybe;
        default:
          return styles.cellTextUnknown;
      }
    };
  }, [styles]);

  const cellGlyph = (status: AvailabilityStatus | undefined) => {
    switch (status) {
      case "free":
        return "✓";
      case "busy":
        return "✕";
      case "maybe":
        return "~";
      default:
        return "·";
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header row: day names ── */}
      <View style={styles.headerRow}>
        <View style={styles.cornerCell} />
        {DAYS.map((day) => (
          <View key={day.key} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day.shortLabel}</Text>
          </View>
        ))}
      </View>

      {/* ── Rows: one per time block ── */}
      {TIME_BLOCKS.map((block) => {
        const effective = ranges?.[block.key] ?? block.defaultRange;
        return (
          <View key={block.key} style={styles.row}>
            {/* Row label */}
            <View style={styles.blockLabelCell}>
              <Text style={styles.blockLabelIcon}>{block.icon}</Text>
              <Text style={styles.blockLabelText}>{block.label}</Text>
              <Text style={styles.blockLabelTime}>
                {formatRangeCompact(effective)}
              </Text>
            </View>

            {/* 7 day cells */}
            {DAYS.map((day) => {
              const key = cellKey(day.key, block.key);
              const status = availability?.[key] as
                | AvailabilityStatus
                | undefined;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    cellStyle(status),
                    disabled && { opacity: 0.5 },
                  ]}
                  onPress={() => onToggle(day.key, block.key)}
                  onLongPress={() => {
                    if (onSet) {
                      onSet(
                        day.key,
                        block.key,
                        status === "free" ? undefined : "free"
                      );
                    }
                  }}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.label} ${block.label}: ${
                    status ?? "unknown"
                  }`}
                  accessibilityHint="Tap to cycle: Free → Busy → Maybe → Unknown"
                >
                  <Text style={[styles.cellText, cellTextStyle(status)]}>
                    {cellGlyph(status)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      {/* ── Legend ── */}
      <View style={styles.legendRow}>
        {STATUSES.map((s) => (
          <View key={s.value} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor:
                    s.value === "free"
                      ? colors.success + "22"
                      : s.value === "busy"
                      ? colors.danger + "22"
                      : colors.warning + "22",
                  borderColor:
                    s.value === "free"
                      ? colors.success
                      : s.value === "busy"
                      ? colors.danger
                      : colors.warning,
                },
              ]}
            />
            <Text style={styles.legendLabel}>{s.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.border,
              },
            ]}
          />
          <Text style={styles.legendLabel}>Unknown</Text>
        </View>
      </View>
    </View>
  );
}