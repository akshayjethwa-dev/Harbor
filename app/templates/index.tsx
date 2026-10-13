import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTemplates } from "../../src/hooks/useTemplates";
import { deleteTemplate } from "../../src/services/templateService";
import { getActivityMeta } from "../../src/constants/activities";

export default function TemplatesScreen() {
  const router = useRouter();
  const { templates, loading, reload } = useTemplates();

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete template?", `"${name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTemplate(id);
          await reload();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Templates</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 64, marginBottom: 12 }}>📋</Text>
          <Text style={styles.emptyTitle}>No templates yet</Text>
          <Text style={styles.emptyText}>
            Save any Plan as a template to reuse its shape for future Plans.
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const act = getActivityMeta(item.activity);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  // Navigate to Plan create with this template pre-loaded
                  router.push({
                    pathname: "/plan/create" as any,
                    params: { templateId: item.id },
                  });
                }}
                onLongPress={() => handleDelete(item.id, item.name)}
              >
                <View style={[styles.cardEmoji, { backgroundColor: act.color + "22" }]}>
                  <Text style={{ fontSize: 26 }}>{act.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>
                    {act.label} · {item.capacity} people · {item.city}
                  </Text>
                  <Text style={styles.cardUsage}>
                    Used {item.usedCount} {item.usedCount === 1 ? "time" : "times"}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
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
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  cardEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 3 },
  cardUsage: { fontSize: 11, color: "#999", marginTop: 4 },
  chevron: { fontSize: 24, color: "#CCC" },
});