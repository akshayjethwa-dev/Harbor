import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { i18n, setLocale } from "../../src/i18n";
import { useTranslation } from "../../src/hooks/useTranslation";

const LANGUAGES = [
  { value: "en", label: "English", native: "English" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
  { value: "gu", label: "Gujarati", native: "ગુજરાતી" },
] as const;

export default function LanguageScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const handleSelect = async (value: "en" | "hi" | "gu") => {
    await setLocale(value);
    // Force re-render
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.language")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 20 }}>
        {LANGUAGES.map((lang) => {
          const active = locale === lang.value;
          return (
            <TouchableOpacity
              key={lang.value}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => handleSelect(lang.value)}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {lang.native}
              </Text>
              <Text style={styles.sub}>{lang.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    marginBottom: 12,
  },
  rowActive: { borderColor: "#E91E63", backgroundColor: "#FFF0F5" },
  label: { fontSize: 18, fontWeight: "800", color: "#333" },
  labelActive: { color: "#E91E63" },
  sub: { fontSize: 12, color: "#999" },
});