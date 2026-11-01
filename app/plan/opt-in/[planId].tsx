// app/plan/opt-in/[planId].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { Plan, PlanParticipant } from "../../../src/types/plan";
import { submitOptIn, checkAndCreateMatch } from "../../../src/services/optInService";
import { useTheme } from "../../../src/theme/ThemeContext";

export default function OptInScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [coAttendees, setCoAttendees] = useState<PlanParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!planId || !user) return;

    const fetchPlan = async () => {
      const snap = await getDoc(doc(db, "plans", planId));
      if (!snap.exists()) {
        Alert.alert("Plan not found");
        router.back();
        return;
      }
      const data = { id: snap.id, ...snap.data() } as Plan;
      setPlan(data);

      // Filter co‑attendees (exclude self)
      const others = (data.participantDetails || []).filter(
        (p) => p.uid !== user.uid
      );
      setCoAttendees(others);
      setLoading(false);
    };

    fetchPlan();
  }, [planId, user]);

  const handleOptIn = async (targetUid: string, value: boolean) => {
    if (!user || !planId) return;

    setSubmitting(targetUid);

    try {
      // 1. Store the directional opt‑in
      await submitOptIn(planId, user.uid, targetUid, value);

      // 2. If positive, check for a mutual match
      if (value) {
        const { matched, chatId } = await checkAndCreateMatch(
          planId,
          user.uid,
          targetUid
        );
        if (matched && chatId) {
          Alert.alert(
            "It's a match! 🎉",
            "You both want to stay in touch. Opening your chat...",
            [{ text: "OK", onPress: () => router.replace(`/plan/chat/${chatId}` as any) }]
          );
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save your choice.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!plan || coAttendees.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>No co‑attendees to show.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          How was {plan.title}?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your choices are private. They’ll only know if you both say yes.
        </Text>

        {coAttendees.map((person) => (
          <View
            key={person.uid}
            style={[styles.card, { borderColor: colors.border }]}
          >
            <Image
              source={{
                uri: person.photoUrl || "https://via.placeholder.com/100",
              }}
              style={styles.avatar}
            />
            <Text style={[styles.name, { color: colors.text }]}>
              {person.name}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.yesBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleOptIn(person.uid, true)}
                disabled={submitting === person.uid}
              >
                {submitting === person.uid ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: colors.textInverse }]}>
                    Meet again 👍
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.noBtn, { borderColor: colors.border }]}
                onPress={() => handleOptIn(person.uid, false)}
                disabled={submitting === person.uid}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                  Not this time
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  card: {
    flexDirection: "column",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  actions: { flexDirection: "row", gap: 12, width: "100%" },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  yesBtn: {},
  noBtn: { borderWidth: 1.5 },
  btnText: { fontSize: 14, fontWeight: "700" },
});