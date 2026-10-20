// src/components/availability/TimeBlockEditModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import { TimeBlockRange } from "../../types/user";
import {
  TimeBlockDefinition,
  formatHour,
  isOvernight,
} from "../../constants/weeklyAvailability";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  visible: boolean;
  block: TimeBlockDefinition | null;
  range: TimeBlockRange;
  isCustom: boolean;
  onSave: (range: TimeBlockRange) => void;
  onReset: () => void;
  onClose: () => void;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      maxHeight: "85%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 12,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
    },
    headerSub: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    chipRow: {
      paddingRight: 20,
      paddingBottom: 4,
    },
    chipRowContent: {
      gap: 8,
      paddingRight: 20,
    },
    chip: {
      minWidth: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.primary + "22",
    },
    chipText: {
      fontSize: 14,
      fontWeight: "700",
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.primary,
    },
    preview: {
      marginHorizontal: 20,
      marginTop: 20,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
    },
    previewLabel: {
      fontSize: 11,
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontWeight: "700",
      marginBottom: 6,
    },
    previewValue: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    previewOvernight: {
      fontSize: 11,
      color: c.warning,
      marginTop: 4,
      fontWeight: "600",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      marginTop: 24,
    },
    button: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    secondaryBtn: {
      backgroundColor: c.bgElevated,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    secondaryBtnText: {
      color: c.text,
      fontSize: 15,
      fontWeight: "700",
    },
    primaryBtn: {
      backgroundColor: c.primary,
    },
    primaryBtnText: {
      color: c.textInverse,
      fontSize: 15,
      fontWeight: "700",
    },
    disabledBtn: {
      opacity: 0.4,
    },
    resetLink: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 4,
    },
    resetLinkText: {
      color: c.danger,
      fontSize: 13,
      fontWeight: "700",
    },
  });

export default function TimeBlockEditModal({
  visible,
  block,
  range,
  isCustom,
  onSave,
  onReset,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [start, setStart] = useState<number>(range.startHour);
  const [end, setEnd] = useState<number>(range.endHour);

  // Re-seed local state each time the modal opens
  useEffect(() => {
    if (visible) {
      setStart(range.startHour);
      setEnd(range.endHour);
    }
  }, [visible, range.startHour, range.endHour]);

  if (!block) return null;

  const isValid = start !== end;
  const overnight = isOvernight({ startHour: start, endHour: end });

  const handleSave = () => {
    if (!isValid) return;
    onSave({ startHour: start, endHour: end });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {block.icon} {block.label}
            </Text>
            <Text style={styles.headerSub}>
              Choose the hours that count as {block.label.toLowerCase()} for you
            </Text>
          </View>

          {/* ── Start hour ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Starts at</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRowContent}
              style={styles.chipRow}
            >
              {HOURS.map((h) => {
                const active = h === start;
                return (
                  <TouchableOpacity
                    key={`s-${h}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStart(h)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── End hour ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ends at</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRowContent}
              style={styles.chipRow}
            >
              {HOURS.map((h) => {
                const active = h === end;
                return (
                  <TouchableOpacity
                    key={`e-${h}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setEnd(h)}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Preview ── */}
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>
              {formatHour(start)} – {formatHour(end)}
            </Text>
            {!isValid ? (
              <Text style={[styles.previewOvernight, { color: colors.danger }]}>
                Start and end must be different
              </Text>
            ) : overnight ? (
              <Text style={styles.previewOvernight}>
                Wraps past midnight (next day)
              </Text>
            ) : null}
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryBtn]}
              onPress={onClose}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryBtn,
                !isValid && styles.disabledBtn,
              ]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* ── Reset to default (only if customized) ── */}
          {isCustom && (
            <TouchableOpacity style={styles.resetLink} onPress={onReset}>
              <Text style={styles.resetLinkText}>Reset to default</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}