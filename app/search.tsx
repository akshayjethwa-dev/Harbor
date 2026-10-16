import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { globalSearch, SearchResults } from "../src/services/searchService";
import { getActivityMeta } from "../src/constants/activities";

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults>({
    plans: [],
    squads: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(
    async (t: string) => {
      if (t.trim().length < 2) {
        setResults({ plans: [], squads: [], users: [] });
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const r = await globalSearch(t, user?.city);
        setResults(r);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => run(term), 300);
    return () => clearTimeout(id);
  }, [term, run]);

  const total =
    results.plans.length + results.squads.length + results.users.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Plans, Squads, People…"
            placeholderTextColor="#999"
            value={term}
            onChangeText={setTerm}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {term.length > 0 && (
            <TouchableOpacity onPress={() => setTerm("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#E91E63" />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={styles.hintEmoji}>🔎</Text>
          <Text style={styles.hintTitle}>Search Harbor</Text>
          <Text style={styles.hintText}>
            Find Plans in your city, Squads to join, or people to connect with.
          </Text>
        </View>
      ) : total === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hintEmoji}>🙁</Text>
          <Text style={styles.hintTitle}>No results for "{term}"</Text>
          <Text style={styles.hintText}>
            Try a different keyword or check for typos.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {results.plans.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Plans ({results.plans.length})
              </Text>
              {results.plans.map((p) => {
                const act = getActivityMeta(p.activity);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.row}
                    onPress={() => router.push(`/plan/${p.id}` as any)}
                  >
                    <View style={[styles.emojiWrap, { backgroundColor: act.color + "22" }]}>
                      <Text style={styles.emoji}>{act.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={styles.rowSub}>
                        {act.label} · {p.city} · {p.spotsFilled}/{p.capacity}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {results.squads.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Squads ({results.squads.length})
              </Text>
              {results.squads.map((s) => {
                const act = getActivityMeta(s.activity);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.row}
                    onPress={() => router.push(`/squad/${s.id}` as any)}
                  >
                    <View style={[styles.emojiWrap, { backgroundColor: act.color + "22" }]}>
                      <Text style={styles.emoji}>{act.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={styles.rowSub}>
                        {act.label} · {s.city} · {s.memberUids.length} members
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {results.users.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                People ({results.users.length})
              </Text>
              {results.users.map((u) => (
                <TouchableOpacity
                  key={u.uid}
                  style={styles.row}
                  onPress={() =>
                    router.push({
                      pathname: "/partner/chat/[id]" as any,
                      params: { id: u.uid },
                    })
                  }
                >
                  {u.photoUrl ? (
                    <Image source={{ uri: u.photoUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>
                        {(u.name ?? "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {u.name} {u.isVerified ? "✅" : ""}
                    </Text>
                    <Text style={styles.rowSub}>
                      ⭐ {u.guestScore ?? 50} · {u.city ?? "—"}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 28 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: "#333" },
  clearIcon: { fontSize: 14, color: "#999", fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emoji: { fontSize: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 16, fontWeight: "700", color: "#999" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  rowSub: { fontSize: 12, color: "#999", marginTop: 3 },
  chevron: { fontSize: 24, color: "#CCC", fontWeight: "300" },
  hintEmoji: { fontSize: 56, marginBottom: 12 },
  hintTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  hintText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
});