import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Plan } from "../../types/plan";
import { sharePlan } from "../../services/shareService";

export default function ShareButton({ plan }: { plan: Plan }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={() => sharePlan(plan)}>
      <Text style={styles.icon}>📤</Text>
      <Text style={styles.text}>Share</Text>
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
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
    gap: 8,
    marginTop: 8,
  },
  icon: { fontSize: 16 },
  text: { fontSize: 14, fontWeight: "700", color: "#333" },
});