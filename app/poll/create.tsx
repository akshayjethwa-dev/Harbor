// app/poll/create.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Timestamp } from "firebase/firestore";
import CreatePollModal from "../../src/components/poll/CreatePollModal";
import { createDatePoll } from "../../src/services/pollService";
import { useAuth } from "../../src/context/AuthContext";

export default function CreatePollScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { planId, planHasDate } = useLocalSearchParams<{
    planId: string;
    planHasDate?: string;
  }>();
  const [submitting, setSubmitting] = useState(false);

  if (!user || !planId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Missing plan or user.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async (
    slots: { startAt: Timestamp; endAt: Timestamp }[],
    timezone: string
  ) => {
    setSubmitting(true);
    try {
      // Firestore write triggers the `onPollCreated` Cloud Function,
      // which sends push notifications to all plan members.
      await createDatePoll({
        planId,
        organizerId: user.uid,
        slots,
        timezone,
      });

      router.replace(`/plan/${planId}` as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        {submitting && <ActivityIndicator />}
        <CreatePollModal
          visible
          planHasDate={planHasDate === "true"}
          onClose={() => router.back()}
          onSubmit={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});