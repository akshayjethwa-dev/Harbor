// src/components/plan/MarkAttendanceModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Plan, PlanParticipant } from "../../types/plan";
import { markAttendance } from "../../services/attendanceService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  plan: Plan;
}

type AttendanceStatus = "attended" | "no_show" | "excused";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800", color: c.text },
  closeBtn: { fontSize: 20, color: c.textMuted },
  desc: { fontSize: 13, color: c.textSecondary, marginBottom: 16 },
  
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  memberName: { fontSize: 15, fontWeight: "600", color: c.text, flex: 1 },
  
  toggleGroup: { flexDirection: "row", backgroundColor: c.bgSubtle, borderRadius: 8, padding: 2 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: c.bgElevated, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  
  toggleText: { fontSize: 12, fontWeight: "700", color: c.textMuted },
  textAttended: { color: c.success },
  textNoShow: { color: c.danger },
  textExcused: { color: c.warning },

  saveBtn: { backgroundColor: c.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: c.textInverse, fontSize: 16, fontWeight: "700" },
});

export default function MarkAttendanceModal({ visible, onClose, plan }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Initialize defaults
      const initial: Record<string, AttendanceStatus> = {};
      plan.participantDetails.forEach(p => {
        if (plan.noShowUids?.includes(p.uid)) initial[p.uid] = "no_show";
        else if (plan.excusedUids?.includes(p.uid)) initial[p.uid] = "excused";
        else {
          // Auto-mark based on check-in if available
          const didCheckIn = plan.checkIns && plan.checkIns[p.uid];
          initial[p.uid] = didCheckIn ? "attended" : "attended"; // Default to attended if no check-in system
        }
      });
      setAttendance(initial);
    }
  }, [visible, plan]);

  const handleSave = async () => {
    const noShows = Object.keys(attendance).filter(uid => attendance[uid] === "no_show");
    const excused = Object.keys(attendance).filter(uid => attendance[uid] === "excused");

    setSaving(true);
    try {
      await markAttendance(plan.id, noShows, excused);
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
            <Text style={styles.title}>Mark Attendance</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          
          <Text style={styles.desc}>
            Mark who showed up. No-shows will lose Guest Score points. Repeat offenders get suspended.
          </Text>

          <ScrollView>
            {plan.participantDetails.map(p => (
              <View key={p.uid} style={styles.memberRow}>
                <Text style={styles.memberName}>{p.name}</Text>
                
                <View style={styles.toggleGroup}>
                  {(["attended", "excused", "no_show"] as AttendanceStatus[]).map(status => {
                    const isActive = attendance[p.uid] === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                        onPress={() => setAttendance(prev => ({ ...prev, [p.uid]: status }))}
                      >
                        <Text style={[
                          styles.toggleText, 
                          isActive && status === "attended" && styles.textAttended,
                          isActive && status === "no_show" && styles.textNoShow,
                          isActive && status === "excused" && styles.textExcused,
                        ]}>
                          {status === "attended" ? "✅" : status === "no_show" ? "❌" : "⚠️"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Submit Attendance"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}