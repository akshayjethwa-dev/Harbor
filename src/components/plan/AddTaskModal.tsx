// src/components/plan/AddTaskModal.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Timestamp } from "firebase/firestore";
import { PlanTask, TaskPriority, TASK_PRIORITIES } from "../../types/task";
import { PlanParticipant } from "../../types/plan";
import { GarbaCrewUser } from "../../types/user";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    assigneeUid: string | null;
    assigneeName: string | null;
    assigneePhotoUrl: string | null;
    dueDate: Timestamp | null;
    priority: TaskPriority;
    category: string;
  }) => Promise<void>;
  participants: PlanParticipant[];
  /** Full user documents to check availability */
  participantUsers: GarbaCrewUser[];
  planStartTime: any;
  initialData?: PlanTask | null;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: Platform.OS === "ios" ? 32 : 20, maxHeight: "90%",
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    title: { fontSize: 20, fontWeight: "800", color: c.text },
    closeBtn: { fontSize: 20, color: c.textMuted, padding: 4 },
    label: { fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 6, marginTop: 12, textTransform: "uppercase" },
    input: {
      backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12, fontSize: 15,
      color: c.text, borderWidth: 1, borderColor: c.border,
    },
    row: { flexDirection: "row", gap: 10 },
    chip: {
      flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5,
      borderColor: c.border, alignItems: "center", backgroundColor: c.bgSubtle,
    },
    chipActive: { borderColor: c.primary, backgroundColor: c.primary + "11" },
    chipText: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
    chipTextActive: { color: c.primary },
    
    // Dropdown Styles
    dropdownBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: c.bgSubtle, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: c.border,
    },
    dropdownText: { fontSize: 15, color: c.text },
    dropdownMenu: {
      backgroundColor: c.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: c.border,
      marginTop: 4, maxHeight: 200, overflow: "hidden",
    },
    dropdownItem: {
      padding: 12, borderBottomWidth: 1, borderBottomColor: c.border,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    dropdownItemText: { fontSize: 14, color: c.text },
    
    warningBox: { backgroundColor: c.warning + "22", padding: 10, borderRadius: 8, marginTop: 8 },
    warningText: { fontSize: 12, color: c.warning, fontWeight: "600" },
    saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
    saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
    saveBtnDisabled: { opacity: 0.5 },
  });

export default function AddTaskModal({
  visible, onClose, onSave, participants, participantUsers, planStartTime, initialData,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title);
        setDesc(initialData.description);
        setAssigneeUid(initialData.assigneeUid);
        setDueDate(initialData.dueDate ? initialData.dueDate.toDate() : null);
        setPriority(initialData.priority);
        setCategory(initialData.category);
      } else {
        setTitle("");
        setDesc("");
        setAssigneeUid(null);
        setDueDate(null);
        setPriority("medium");
        setCategory("");
      }
      setShowDropdown(false);
    }
  }, [visible, initialData]);

  const selectedUser = participantUsers.find((u) => u.uid === assigneeUid);
  const hasNoAvailability = selectedUser && (!selectedUser.availability || Object.keys(selectedUser.availability).length === 0);

  const isDateAfterPlan = dueDate && planStartTime && 
    dueDate.getTime() > (planStartTime.toDate ? planStartTime.toDate().getTime() : new Date(planStartTime).getTime());

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }

    setSaving(true);
    try {
      const assignee = participants.find((p) => p.uid === assigneeUid);
      
      await onSave({
        title: title.trim(),
        description: desc.trim(),
        assigneeUid: assigneeUid,
        assigneeName: assignee ? assignee.name : null,
        assigneePhotoUrl: assignee ? assignee.photoUrl : null,
        dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
        priority,
        category: category.trim(),
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? "Edit Task" : "New Task"}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input} value={title} onChangeText={setTitle}
              placeholder="e.g., Book the venue" placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]} value={desc} onChangeText={setDesc}
              placeholder="Details..." placeholderTextColor={colors.textMuted} multiline
            />

            <Text style={styles.label}>Category (Optional)</Text>
            <TextInput
              style={styles.input} value={category} onChangeText={setCategory}
              placeholder="e.g., Logistics, Food" placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.row}>
              {TASK_PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, priority === p.value && styles.chipActive]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={[styles.chipText, priority === p.value && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dropdown Assignee */}
            <Text style={styles.label}>Assignee</Text>
            <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDropdown(!showDropdown)}>
              <Text style={styles.dropdownText}>
                {assigneeUid ? participants.find(p => p.uid === assigneeUid)?.name || "Unknown" : "Unassigned"}
              </Text>
              <Text style={{ color: colors.textMuted }}>▼</Text>
            </TouchableOpacity>

            {showDropdown && (
              <ScrollView style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => { setAssigneeUid(null); setShowDropdown(false); }}
                >
                  <Text style={styles.dropdownItemText}>Unassigned</Text>
                </TouchableOpacity>
                {participants.map((p) => (
                  <TouchableOpacity
                    key={p.uid}
                    style={styles.dropdownItem}
                    onPress={() => { setAssigneeUid(p.uid); setShowDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {hasNoAvailability && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ This member hasn't set their availability yet. They might miss this task.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: dueDate ? colors.text : colors.textMuted }}>
                {dueDate ? dueDate.toLocaleDateString() : "Select a date (optional)"}
              </Text>
            </TouchableOpacity>
            
            {dueDate && (
              <TouchableOpacity onPress={() => setDueDate(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.danger, fontSize: 12 }}>Clear date</Text>
              </TouchableOpacity>
            )}

            {isDateAfterPlan && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ This due date is after the plan's scheduled start time.
                </Text>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()} mode="date" display="default"
                onChange={(event, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) setDueDate(selected);
                }}
              />
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Task"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}