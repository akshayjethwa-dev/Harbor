// app/plan/tasks/[id].tsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { Plan } from "../../../src/types/plan";
import { PlanTask } from "../../../src/types/task";
import { GarbaCrewUser } from "../../../src/types/user";
import { TaskTemplate } from "../../../src/types/taskTemplate";
import {
  subscribeToTasks, createTask, updateTask, deleteTask, reorderTasks, 
  claimTask, unclaimTask, completeTask, undoCompleteTask,
  savePlanTasksAsTemplate, applyTaskTemplate
} from "../../../src/services/taskService";
import { getUsersByIds } from "../../../src/services/userService";
import { useAuth } from "../../../src/context/AuthContext";
import TaskCard from "../../../src/components/plan/TaskCard";
import AddTaskModal from "../../../src/components/plan/AddTaskModal";
import ApplyTemplateModal from "../../../src/components/plan/ApplyTemplateModal";
import SaveTemplateModal from "../../../src/components/plan/SaveTemplateModal";
import CommentsModal from "../../../src/components/plan/CommentsModal";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useThemedStyles } from "../../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../../src/theme/colors";

export default function PlanTasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [allTasks, setAllTasks] = useState<PlanTask[]>([]);
  const [participantUsers, setParticipantUsers] = useState<GarbaCrewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeCommentTask, setActiveCommentTask] = useState<PlanTask | null>(null);

  const activeTasks = allTasks.filter((t) => !t.isCompleted);
  const completedTasks = allTasks.filter((t) => t.isCompleted);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "plans", id), (snap) => {
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Plan;
        setPlan(p);
        if (p.participants) {
          getUsersByIds(p.participants).then(setParticipantUsers);
        }
      }
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToTasks(id, (fetchedTasks) => {
      setAllTasks(fetchedTasks);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const isOrganizer = user?.uid === plan?.hostUid;
  const isCancelled = plan?.status === "cancelled";
  const isParticipant = plan?.participants?.includes(user?.uid || "") || false;

  const handleDragEnd = useCallback(({ data }: { data: PlanTask[] }) => {
    const merged = [...data, ...completedTasks];
    setAllTasks(merged);
    if (id) reorderTasks(id, merged).catch((e) => console.warn("Reorder failed:", e));
  }, [id, completedTasks]);

  // ─── Task 41: Accessibility Move Logic ───
  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= activeTasks.length) return;
    
    const newData = [...activeTasks];
    const temp = newData[index];
    newData[index] = newData[newIndex];
    newData[newIndex] = temp;
    
    setAllTasks([...newData, ...completedTasks]);
    if (id) reorderTasks(id, [...newData, ...completedTasks]);
  };

  const handleSaveTask = async (taskData: any) => {
    if (!id) return;
    if (editingTask) {
      await updateTask(id, editingTask.id, taskData);
    } else {
      const maxOrder = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.order)) : 0;
      await createTask(id, taskData, maxOrder);
    }
  };

  const handleDelete = (task: PlanTask) => {
    Alert.alert("Delete Task", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          if (id) await deleteTask(id, task.id);
        } 
      }
    ]);
  };

  const handleClaim = (task: PlanTask) => {
    if (!id || !user) return;
    const performClaim = async () => {
      try {
        const currentUser = participantUsers.find((u) => u.uid === user.uid);
        if (!currentUser) return;
        await claimTask(id, task.id, currentUser);
      } catch (e: any) { Alert.alert("Could not claim task", e.message); }
    };

    if (task.dueDate && task.dueDate.toMillis() < Date.now()) {
      Alert.alert("Task is Overdue", "Are you sure you want to claim it?", [
        { text: "Cancel", style: "cancel" },
        { text: "Claim anyway", onPress: performClaim }
      ]);
      return;
    }
    performClaim();
  };

  const handleUnclaim = async (task: PlanTask) => {
    if (!id) return;
    try { await unclaimTask(id, task.id); } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleComplete = async (task: PlanTask) => {
    if (!id || !user || !plan) return;
    const currentUser = participantUsers.find((u) => u.uid === user.uid);
    if (!currentUser) return;

    let isLate = false;
    if (plan.endTime) {
      const endMs = plan.endTime.toMillis ? plan.endTime.toMillis() : new Date(plan.endTime).getTime();
      if (Date.now() > endMs) isLate = true;
    }

    try {
      await completeTask(id, task.id, task.title, currentUser, isLate);
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleReopen = async (task: PlanTask) => {
    if (!id) return;
    try { await undoCompleteTask(id, task.id); } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleSaveTemplate = async (name: string) => {
    if (!id || !user) return;
    await savePlanTasksAsTemplate(id, user.uid, name, activeTasks);
    Alert.alert("Success", "Template saved!");
  };

  const handleApplyTemplate = async (template: TaskTemplate) => {
    if (!id) return;
    const maxOrder = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.order)) : 0;
    await applyTaskTemplate(id, template, maxOrder);
    Alert.alert("Success", `Applied ${template.tasks.length} tasks!`);
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<PlanTask>) => {
    const index = getIndex() ?? -1;
    
    return (
      <TouchableOpacity
        onLongPress={isOrganizer && !isCancelled ? () => handleDelete(item) : undefined}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <TaskCard
          task={item}
          isActive={isActive}
          onLongPress={drag}
          onPress={() => {
            if (isOrganizer && !isCancelled) {
              setEditingTask(item);
              setShowModal(true);
            }
          }}
          isArchived={isCancelled}
          isParticipant={isParticipant}
          isOrganizer={isOrganizer}
          onClaim={() => handleClaim(item)}
          onUnclaim={() => handleUnclaim(item)}
          onComplete={() => handleComplete(item)}
          onReopen={() => handleReopen(item)}
          onComment={() => setActiveCommentTask(item)}
          planId={id}
          // Task 41: Pass accessibility move handlers
          onMoveUp={index > 0 ? () => moveItem(index, -1) : undefined}
          onMoveDown={index < activeTasks.length - 1 ? () => moveItem(index, 1) : undefined}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={{ width: 40 }} />
      </View>

      {isCancelled && (
        <View style={styles.archiveBanner}>
          <Text style={styles.archiveText}>🛑 Plan cancelled. Active tasks are archived.</Text>
        </View>
      )}

      {isOrganizer && !isCancelled && (
        <View style={styles.templateBar}>
          <TouchableOpacity style={styles.templateBtn} onPress={() => setShowApplyModal(true)}>
            <Text style={styles.templateBtnText}>Apply Template</Text>
          </TouchableOpacity>
          
          {activeTasks.length > 0 && (
            <TouchableOpacity style={styles.templateBtn} onPress={() => setShowSaveModal(true)}>
              <Text style={styles.templateBtnText}>Save as Template</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <DraggableFlatList
          data={activeTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No active tasks. All done!</Text>}
          ListFooterComponent={
            <View style={styles.doneContainer}>
              <TouchableOpacity style={styles.doneHeader} onPress={() => setShowDone(!showDone)}>
                <Text style={styles.doneTitle}>Done ({completedTasks.length})</Text>
                <Text style={styles.doneArrow}>{showDone ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {showDone && (
                <View style={styles.doneList}>
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isActive={false}
                      onLongPress={() => {}}
                      onPress={() => {}}
                      isArchived={isCancelled}
                      isParticipant={isParticipant}
                      isOrganizer={isOrganizer}
                      onReopen={() => handleReopen(task)}
                      onComment={() => setActiveCommentTask(task)}
                      planId={id}
                    />
                  ))}
                  {completedTasks.length === 0 && (
                    <Text style={styles.emptyTextSmall}>No completed tasks yet.</Text>
                  )}
                </View>
              )}
            </View>
          }
        />
      )}

      {isOrganizer && !isCancelled && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setEditingTask(null); setShowModal(true); }}
        >
          <Text style={styles.fabText}>+ Add Task</Text>
        </TouchableOpacity>
      )}

      <AddTaskModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTask}
        participants={plan?.participantDetails || []}
        participantUsers={participantUsers}
        planStartTime={plan?.startTime}
        initialData={editingTask}
      />

      {isOrganizer && (
        <>
          <ApplyTemplateModal
            visible={showApplyModal}
            onClose={() => setShowApplyModal(false)}
            ownerUid={user?.uid || ""}
            onSelect={handleApplyTemplate}
          />
          <SaveTemplateModal
            visible={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            onSave={handleSaveTemplate}
          />
        </>
      )}

      {activeCommentTask && (
        <CommentsModal
          visible={!!activeCommentTask}
          onClose={() => setActiveCommentTask(null)}
          planId={id || ""}
          itemId={activeCommentTask.id}
          itemType="task"
          itemTitle={activeCommentTask.title}
          participants={plan?.participantDetails || []}
        />
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
    archiveBanner: {
      backgroundColor: c.danger + "22", padding: 14, marginHorizontal: 16,
      marginTop: 16, borderRadius: 10, borderWidth: 1, borderColor: c.danger,
    },
    archiveText: { color: c.danger, fontSize: 13, fontWeight: "600", textAlign: "center" },
    
    templateBar: {
      flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, gap: 10,
    },
    templateBtn: {
      flex: 1, padding: 10, backgroundColor: c.bgSubtle, borderRadius: 8, 
      alignItems: "center", borderWidth: 1, borderColor: c.border,
    },
    templateBtnText: { color: c.primary, fontWeight: "700", fontSize: 13 },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { textAlign: "center", color: c.textMuted, marginTop: 40, fontSize: 15 },
    
    doneContainer: { marginTop: 24 },
    doneHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border,
    },
    doneTitle: { fontSize: 15, fontWeight: "700", color: c.textSecondary },
    doneArrow: { fontSize: 14, color: c.textSecondary },
    doneList: { marginTop: 8 },
    emptyTextSmall: { fontSize: 13, color: c.textMuted, fontStyle: "italic", marginTop: 10 },

    fab: {
      position: "absolute", bottom: 24, right: 24, backgroundColor: c.primary,
      paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
    },
    fabText: { color: c.textInverse, fontWeight: "800", fontSize: 15 },
  });