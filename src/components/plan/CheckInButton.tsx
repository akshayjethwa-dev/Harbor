import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Plan } from "../../types/plan";
import { useAuth } from "../../context/AuthContext";
import { checkInToPlan, getCheckInState } from "../../services/checkinService";

export default function CheckInButton({ plan }: { plan: Plan }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const state = getCheckInState(plan, user.uid);

  // Not a participant → don't show
  if (!plan.participants.includes(user.uid)) return null;

  if (state.alreadyCheckedIn) {
    return (
      <View style={[styles.btn, styles.btnDone]}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.textDone}>Checked in</Text>
      </View>
    );
  }

  if (!state.canCheckIn) {
    return (
      <View style={[styles.btn, styles.btnDisabled]}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.textDisabled}>{state.reason}</Text>
      </View>
    );
  }

  const handlePress = async () => {
    setLoading(true);
    try {
      const res = await checkInToPlan(plan.id);
      Alert.alert(
        "Checked in! ✅",
        res.distanceMeters != null
          ? `You're ${res.distanceMeters}m from the venue.`
          : "Enjoy the Plan!"
      );
    } catch (e: any) {
      Alert.alert("Check-in failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.text}>I'm here</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#E91E63",
    gap: 8,
    marginBottom: 12,
  },
  btnDone: { backgroundColor: "#E8F5E9" },
  btnDisabled: { backgroundColor: "#F0F0F0" },
  icon: { fontSize: 18 },
  text: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  textDone: { color: "#2E7D32", fontWeight: "700", fontSize: 15 },
  textDisabled: { color: "#999", fontWeight: "600", fontSize: 14 },
});