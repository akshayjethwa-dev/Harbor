// app/my-tasks.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { collectionGroup, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../src/lib/firebase";
import { useAuth } from "../src/context/AuthContext";
import { PlanTask } from "../src/types/task";
import TaskCard from "../src/components/plan/TaskCard";
import { useTheme } from "../src/theme/ThemeContext";
import { useThemedStyles } from "../src/hooks/useThemedStyles";
import { ThemeColors } from "../src/theme/colors";
import { declineTask } from "../src/services/taskService";

export default function MyTasksScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Collection Group query to find all tasks assigned to this user
    const q = query(
      collectionGroup(db, "tasks"),
      where("assigneeUid", "==", user.uid),
      where("isArchived", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched: PlanTask[] = [];
      snap.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as PlanTask);
      });
      // Sort by due date
      fetched.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.toMillis() - b.dueDate.toMillis();
      });
      setTasks(fetched);
      setLoading(false);
    }, (err) => {
      console.warn("MyTasks query failed:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleDecline = async (task: PlanTask) => {
    try {
      await declineTask(task.planId, task.id);
    } catch (e: any) {
      console.warn("Decline failed", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>You have no assigned tasks.</Text>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={false}
                onLongPress={() => {}}
                onPress={() => router.push(`/plan/tasks/${task.planId}` as any)}
                onDecline={() => handleDecline(task)}
                isArchived={false}
                isParticipant={true} // <-- ADDED THIS PROP TO FIX THE ERROR
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { padding: 8, marginLeft: -8 },
    backIcon: { fontSize: 22, color: c.text },
    headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { textAlign: "center", color: c.textMuted, marginTop: 40, fontSize: 15 },
  });