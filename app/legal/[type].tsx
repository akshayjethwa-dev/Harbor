// app/legal/[type].tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getLatestLegalDoc, LegalDocument } from "../../src/services/legalService";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20 },
  versionText: { fontSize: 12, color: c.textMuted, marginBottom: 16, textAlign: "center" },
  body: { fontSize: 15, color: c.textSecondary, lineHeight: 24 },
});

export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: "privacy" | "terms" }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type) return;
    getLatestLegalDoc(type).then((data) => {
      setDoc(data);
      setLoading(false);
    });
  }, [type]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!doc) {
    return <View style={styles.center}><Text>Document not found.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === "privacy" ? "Privacy Policy" : "Terms of Service"}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.versionText}>Version {doc.version} • Last updated {doc.updatedAt?.toDate?.().toLocaleDateString()}</Text>
        <Text style={styles.body}>{doc.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}