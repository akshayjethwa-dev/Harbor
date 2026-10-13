import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, ThemeMode } from "../../src/theme/ThemeContext";

const OPTIONS: { value: ThemeMode; label: string; emoji: string }[] = [
  { value: "system", label: "Match system", emoji: "🖥️" },
  { value: "light", label: "Light", emoji: "☀️" },
  { value: "dark", label: "Dark", emoji: "🌙" },
];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { mode, setMode, colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 20 }}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.row,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySubtle : colors.bgElevated,
                },
              ]}
              onPress={() => setMode(opt.value)}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.primary : colors.text },
                ]}
              >
                {opt.label}
              </Text>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: active ? colors.primary : colors.borderStrong,
                  },
                ]}
              >
                {active && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backText: { fontSize: 22, fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 14,
  },
  emoji: { fontSize: 24 },
  label: { flex: 1, fontSize: 15, fontWeight: "700" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});