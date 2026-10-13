import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Plan } from "../../types/plan";
import { addPlanToCalendar } from "../../services/calendarService";

export default function AddToCalendarButton({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      await addPlanToCalendar(plan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#E91E63" size="small" />
      ) : (
        <>
          <Text style={styles.icon}>📅</Text>
          <Text style={styles.text}>Add to calendar</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E91E63",
    backgroundColor: "#FFF",
    gap: 8,
    marginTop: 8,
  },
  icon: { fontSize: 16 },
  text: { fontSize: 14, fontWeight: "700", color: "#E91E63" },
});