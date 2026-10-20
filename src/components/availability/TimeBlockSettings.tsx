// src/components/availability/TimeBlockSettings.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import {
  TIME_BLOCKS,
  formatRangeFull,
  isDefaultRange,
} from "../../constants/weeklyAvailability";
import {
  TimeBlockKey,
  TimeBlockRange,
  TimeBlockRanges,
} from "../../types/user";
import TimeBlockEditModal from "./TimeBlockEditModal";

interface Props {
  ranges: TimeBlockRanges;
  onChange: (block: TimeBlockKey, range: TimeBlockRange) => void;
  onResetBlock: (block: TimeBlockKey) => void;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.bgElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    icon: {
      fontSize: 22,
      marginRight: 12,
    },
    labelCol: {
      flex: 1,
    },
    label: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    range: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    customBadge: {
      fontSize: 10,
      color: c.primary,
      fontWeight: "700",
      marginTop: 2,
      letterSpacing: 0.4,
    },
    editBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    editBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.primary,
    },
  });

export default function TimeBlockSettings({
  ranges,
  onChange,
  onResetBlock,
}: Props) {
  const styles = useThemedStyles(makeStyles);

  const [editingKey, setEditingKey] = useState<TimeBlockKey | null>(null);
  const editingBlock =
    editingKey ? TIME_BLOCKS.find((b) => b.key === editingKey) ?? null : null;

  const currentRange: TimeBlockRange = editingBlock
    ? ranges[editingBlock.key] ?? editingBlock.defaultRange
    : { startHour: 0, endHour: 0 };

  const handleSave = (range: TimeBlockRange) => {
    if (editingKey) onChange(editingKey, range);
    setEditingKey(null);
  };

  const handleReset = () => {
    if (editingKey) onResetBlock(editingKey);
    setEditingKey(null);
  };

  return (
    <>
      <View style={styles.container}>
        {TIME_BLOCKS.map((block, idx) => {
          const effective = ranges[block.key] ?? block.defaultRange;
          const custom = !isDefaultRange(ranges, block.key);
          const isLast = idx === TIME_BLOCKS.length - 1;

          return (
            <TouchableOpacity
              key={block.key}
              style={[styles.row, isLast && styles.rowLast]}
              onPress={() => setEditingKey(block.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{block.icon}</Text>
              <View style={styles.labelCol}>
                <Text style={styles.label}>{block.label}</Text>
                <Text style={styles.range}>{formatRangeFull(effective)}</Text>
                {custom && <Text style={styles.customBadge}>CUSTOM</Text>}
              </View>
              <View style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TimeBlockEditModal
        visible={editingKey !== null}
        block={editingBlock}
        range={currentRange}
        isCustom={editingKey ? !isDefaultRange(ranges, editingKey) : false}
        onSave={handleSave}
        onReset={handleReset}
        onClose={() => setEditingKey(null)}
      />
    </>
  );
}