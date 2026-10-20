// app/settings/availability.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AvailabilityGrid from "../../src/components/availability/AvailabilityGrid";
import { useAvailability } from "../../src/hooks/useAvailability";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";
import {
  countSetCells,
  isAvailabilityEmpty,
} from "../../src/constants/weeklyAvailability";

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      padding: 20,
      paddingBottom: 120,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: c.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 20,
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    statsCard: {
      backgroundColor: c.bgElevated,
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
    },
    statLabel: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    emptyHint: {
      backgroundColor: c.warning + "15",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: c.warning,
    },
    emptyHintText: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    button: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: c.primary,
    },
    primaryButtonText: {
      color: c.textInverse,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryButton: {
      backgroundColor: c.bgElevated,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    secondaryButtonText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "700",
    },
    dangerButton: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.danger,
      marginTop: 12,
    },
    dangerButtonText: {
      color: c.danger,
      fontSize: 15,
      fontWeight: "700",
    },
    disabledButton: {
      opacity: 0.45,
    },
  });

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────
export default function AvailabilityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const {
    draft,
    isDirty,
    isEmpty,
    hasSavedAvailability,
    save,
    clearRemote,
    reset,
    toggleCell,
    setCell,
    clearAll,
    saving,
    error,
  } = useAvailability();

  const setCount = countSetCells(draft);

  // ── Confirm discard if the user navigates away with unsaved changes ──
  const handleBack = () => {
    if (isDirty && !saving) {
      if (Platform.OS === "web") {
        const ok = window.confirm(
          "You have unsaved changes. Discard them?"
        );
        if (ok) router.back();
        return;
      }
      Alert.alert(
        "Discard changes?",
        "You have unsaved availability changes. Discard them?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              reset();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // ── Save handler ──
  const handleSave = async () => {
    try {
      await save();
      if (Platform.OS === "web") {
        window.alert("Availability saved!");
      } else {
        Alert.alert("Saved", "Your availability has been updated.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch {
      // error already surfaced via the hook
    }
  };

  // ── Clear-all handler ──
  const handleClearAll = () => {
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Clear all availability? This will mark every slot as unknown."
      );
      if (ok) clearAll();
      return;
    }
    Alert.alert(
      "Clear all availability?",
      "Every slot will become 'unknown' (not busy). You can still set them again later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear all", style: "destructive", onPress: clearAll },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <Text style={styles.title}>Your Availability</Text>
        <Text style={styles.subtitle}>
          Mark when you're generally free each week. We'll use this to suggest
          plan times that work for you — no need to re-enter it every time.
        </Text>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{setCount}</Text>
            <Text style={styles.statLabel}>Slots set</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>28</Text>
            <Text style={styles.statLabel}>Total slots</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {isEmpty ? "Unknown" : hasSavedAvailability ? "Set" : "New"}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* ── Empty-state hint ── */}
        {isEmpty && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>
              💡 You haven't marked any availability yet. Empty slots are
              treated as <Text style={{ fontWeight: "700" }}>unknown</Text> —
              not busy — so you'll still get suggestions, but marking a few
              slots helps us find better times.
            </Text>
          </View>
        )}

        {/* ── Grid ── */}
        <Text style={styles.sectionLabel}>Weekly grid</Text>
        <AvailabilityGrid
          availability={draft}
          onToggle={toggleCell}
          onSet={setCell}
          disabled={saving}
        />

        {/* ── Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              (!isDirty || saving) && styles.disabledButton,
            ]}
            onPress={reset}
            disabled={!isDirty || saving}
          >
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!isDirty || saving) && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Clear all (destructive) ── */}
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearAll}
          disabled={saving}
        >
          <Text style={styles.dangerButtonText}>Clear all availability</Text>
        </TouchableOpacity>

        {/* ── Back ── */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { marginTop: 12 }]}
          onPress={handleBack}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        {/* ── Error ── */}
        {error ? (
          <Text
            style={{
              color: colors.danger,
              textAlign: "center",
              marginTop: 16,
              fontSize: 13,
            }}
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}