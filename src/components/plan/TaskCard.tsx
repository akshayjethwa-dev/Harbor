// src/components/plan/TaskCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { PlanTask, TASK_PRIORITIES } from "../../types/task";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";
import ReactionBar from "./ReactionBar";

interface Props {
  task: PlanTask;
  isActive: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onDecline?: () => void;
  onClaim?: () => void;
  onUnclaim?: () => void;
  onComplete?: () => void;
  onReopen?: () => void;
  onComment?: () => void;
  // Task 41: Accessibility Fallbacks for Drag & Drop
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isArchived: boolean;
  isParticipant?: boolean;
  isOrganizer?: boolean;
  planId?: string;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgElevated, borderRadius: 12, padding: 14, marginBottom: 8,
      borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    cardActive: { borderColor: c.primary, transform: [{ scale: 1.02 }], shadowOpacity: 0.1, elevation: 4 },
    cardCompleted: { opacity: 0.8, backgroundColor: c.bgSubtle },
    
    checkbox: {
      width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.textMuted,
      alignItems: "center", justifyContent: "center", marginRight: 12,
    },
    checkboxCompleted: { backgroundColor: c.success, borderColor: c.success },
    checkIcon: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

    priorityStrip: { width: 4, height: "100%", borderRadius: 2, marginRight: 12 },
    content: { flex: 1 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    title: { fontSize: 16, fontWeight: "700", color: c.text },
    titleCompleted: { textDecorationLine: "line-through", color: c.textMuted },
    category: {
      fontSize: 10, fontWeight: "700", color: c.textMuted,
      backgroundColor: c.bgSubtle, paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 4, overflow: "hidden",
    },
    desc: { fontSize: 13, color: c.textSecondary, marginBottom: 8 },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    assignee: { flexDirection: "row", alignItems: "center", gap: 6 },
    avatar: { width: 24, height: 24, borderRadius: 12 },
    avatarFallback: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center" },
    avatarInitial: { fontSize: 11, color: c.textMuted, fontWeight: "700" },
    assigneeText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
    dueDate: { fontSize: 12, color: c.textSecondary },
    overdue: { color: c.danger, fontWeight: "700" },
    
    completedBox: {
      marginTop: 8, backgroundColor: c.success + "11", padding: 8, borderRadius: 6,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    completedText: { fontSize: 12, color: c.success, fontWeight: "600" },
    lateBadge: {
      backgroundColor: c.warning + "22", paddingHorizontal: 6, paddingVertical: 2,
      borderRadius: 4, fontSize: 10, color: c.warning, fontWeight: "700",
    },

    dragHandle: { padding: 10, marginLeft: 8 },
    dragHandleText: { fontSize: 18, color: c.textMuted },
    archived: { opacity: 0.6 },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" },
    actionBtn: {
      paddingVertical: 8, paddingHorizontal: 12,
      backgroundColor: c.bgSubtle, borderRadius: 8,
      borderWidth: 1, borderColor: c.border,
    },
    actionBtnPrimary: { backgroundColor: c.primary + "11", borderColor: c.primary + "33" },
    actionBtnWarning: { borderColor: c.warning },
    actionText: { fontSize: 12, fontWeight: "700", color: c.textSecondary },
    actionTextPrimary: { color: c.primary },
    actionTextWarning: { color: c.warning },
    actionTextDanger: { color: c.danger },
    
    // Task 41: Accessibility Reorder Buttons
    a11yReorderCol: { gap: 4, marginLeft: 8 },
    a11yReorderBtn: { padding: 8, backgroundColor: c.bgSubtle, borderRadius: 6, borderWidth: 1, borderColor: c.border },
    a11yReorderText: { fontSize: 14, color: c.textSecondary, fontWeight: "bold" },
  });

export default function TaskCard({
  task, isActive, onLongPress, onPress, onDecline, onClaim, onUnclaim, onComplete, onReopen, onComment, onMoveUp, onMoveDown, isArchived, isParticipant = false, isOrganizer = false, planId
}: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const meta = TASK_PRIORITIES.find((p) => p.value === task.priority) || TASK_PRIORITIES[1];
  
  const isOverdue = task.dueDate && task.dueDate.toMillis() < Date.now();
  const isAssignee = user?.uid === task.assigneeUid;
  
  const isWithin5Mins = task.claimedAt && (Date.now() - task.claimedAt.toMillis() < 5 * 60 * 1000);
  const isWithin30Secs = task.completedAt && (Date.now() - task.completedAt.toMillis() < 30 * 1000);

  return (
    <TouchableOpacity
      style={[
        styles.card, isActive && styles.cardActive, 
        isArchived && styles.archived, task.isCompleted && styles.cardCompleted
      ]}
      onLongPress={isArchived || task.isCompleted ? undefined : onLongPress}
      onPress={isArchived ? undefined : onPress}
      activeOpacity={0.8}
      disabled={isArchived}
      accessible={true}
      accessibilityLabel={`Task: ${task.title}. Assigned to ${task.assigneeName || "no one"}. Priority: ${task.priority}. ${task.isCompleted ? "Completed." : "Incomplete."}`}
    >
      {!isArchived && (
        <TouchableOpacity 
          style={[styles.checkbox, task.isCompleted && styles.checkboxCompleted]}
          onPress={() => {
            if (task.isCompleted) return;
            if (onComplete) onComplete();
          }}
          disabled={task.isCompleted}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.isCompleted }}
          accessibilityLabel="Mark task as complete"
        >
          {task.isCompleted && <Text style={styles.checkIcon}>✓</Text>}
        </TouchableOpacity>
      )}

      <View style={[styles.priorityStrip, { backgroundColor: meta.color }]} />
      
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, task.isCompleted && styles.titleCompleted]} numberOfLines={1}>{task.title}</Text>
          {task.category ? <Text style={styles.category}>{task.category.toUpperCase()}</Text> : null}
        </View>
        
        {task.description ? <Text style={styles.desc} numberOfLines={2}>{task.description}</Text> : null}

        <View style={styles.footer}>
          <View style={styles.assignee}>
            {task.assigneePhotoUrl ? (
              <Image source={{ uri: task.assigneePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{(task.assigneeName || "?").charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.assigneeText}>{task.assigneeName || "Unassigned"}</Text>
          </View>
          {task.dueDate && (
            <Text style={[styles.dueDate, isOverdue && !task.isCompleted && styles.overdue]}>
              📅 {task.dueDate.toDate().toLocaleDateString()}
            </Text>
          )}
        </View>

        {task.isCompleted && (
          <View style={styles.completedBox}>
            <Text style={styles.completedText}>✅ Done by {task.completedByName}</Text>
            {task.completedLate && <Text style={styles.lateBadge}>LATE</Text>}
          </View>
        )}

        {/* Action Buttons */}
        {!isArchived && (
          <View style={styles.actionRow}>
            {!task.isCompleted && !task.assigneeUid && isParticipant && onClaim && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onClaim} accessibilityRole="button" accessibilityLabel="Claim this task">
                <Text style={[styles.actionText, styles.actionTextPrimary]}>Claim</Text>
              </TouchableOpacity>
            )}

            {!task.isCompleted && isAssignee && (
              isWithin5Mins && onUnclaim ? (
                <TouchableOpacity style={styles.actionBtn} onPress={onUnclaim} accessibilityRole="button" accessibilityLabel="Unclaim task">
                  <Text style={[styles.actionText, styles.actionTextDanger]}>Unclaim (5m)</Text>
                </TouchableOpacity>
              ) : onDecline ? (
                <TouchableOpacity style={styles.actionBtn} onPress={onDecline} accessibilityRole="button" accessibilityLabel="Decline task">
                  <Text style={[styles.actionText, styles.actionTextDanger]}>Decline</Text>
                </TouchableOpacity>
              ) : null
            )}

            {task.isCompleted && onReopen && (
              isWithin30Secs ? (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarning]} onPress={onReopen} accessibilityRole="button" accessibilityLabel="Undo completion">
                  <Text style={[styles.actionText, styles.actionTextWarning]}>Undo (30s)</Text>
                </TouchableOpacity>
              ) : isOrganizer ? (
                <TouchableOpacity style={styles.actionBtn} onPress={onReopen} accessibilityRole="button" accessibilityLabel="Reopen task">
                  <Text style={styles.actionText}>Reopen Task</Text>
                </TouchableOpacity>
              ) : null
            )}

            {onComment && (
              <TouchableOpacity style={styles.actionBtn} onPress={onComment} accessibilityRole="button" accessibilityLabel="View or add comments">
                <Text style={styles.actionText}>💬 Comment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Task 21: Reactions */}
        {!isArchived && planId && (
          <ReactionBar
            planId={planId}
            itemId={task.id}
            collectionName="tasks"
            reactions={task.reactions}
            currentUserId={user?.uid || ""}
          />
        )}
      </View>

      {/* Task 41: Accessibility Fallback for Drag & Drop */}
      {!isArchived && !task.isCompleted && (onMoveUp || onMoveDown) && (
        <View style={styles.a11yReorderCol}>
          {onMoveUp && (
            <TouchableOpacity 
              style={styles.a11yReorderBtn} 
              onPress={onMoveUp}
              accessibilityRole="button"
              accessibilityLabel="Move task up"
            >
              <Text style={styles.a11yReorderText}>↑</Text>
            </TouchableOpacity>
          )}
          {onMoveDown && (
            <TouchableOpacity 
              style={styles.a11yReorderBtn} 
              onPress={onMoveDown}
              accessibilityRole="button"
              accessibilityLabel="Move task down"
            >
              <Text style={styles.a11yReorderText}>↓</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Visual Drag Handle (Hidden from Screen Readers) */}
      {!isArchived && !task.isCompleted && (
        <View style={styles.dragHandle} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
          <Text style={styles.dragHandleText}>≡</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}