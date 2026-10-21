// src/components/onboarding/FirstPlanPrompt.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: "#FFF5F8", // Light pink background
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E91E63",
  },
  icon: { fontSize: 32, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#E91E63", marginBottom: 4 },
  desc: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  primaryBtn: { backgroundColor: "#E91E63" },
  primaryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  dismissBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#E91E63" },
  dismissText: { color: "#E91E63", fontWeight: "700", fontSize: 14 },
});

export default function FirstPlanPrompt() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [visible, setVisible] = useState(false);
  const [hasSquad, setHasSquad] = useState(false);

  useEffect(() => {
    const checkPromptStatus = async () => {
      if (!user) return;

      // Edge Case: User has already created or joined plans → skip prompt
      const hasPlans = (user.plansCreatedCount || 0) > 0 || (user.plansHosted || 0) > 0 || (user.plansJoined || 0) > 0;
      if (hasPlans) {
        setVisible(false);
        return;
      }

      // Check 24h dismissal
      const dismissedAtStr = await AsyncStorage.getItem("first_plan_prompt_dismissed");
      if (dismissedAtStr) {
        const dismissedAt = parseInt(dismissedAtStr, 10);
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) {
          setVisible(false);
          return;
        }
      }

      // Check if user has a squad
      const squadsQ = query(
        collection(db, "squads"),
        where("memberUids", "array-contains", user.uid)
      );
      const squadsSnap = await getDocs(squadsQ);
      
      setHasSquad(!squadsSnap.empty);
      setVisible(true);
    };

    checkPromptStatus();
  }, [user]);

  const handleDismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem("first_plan_prompt_dismissed", Date.now().toString());
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{hasSquad ? "🚀" : "👥"}</Text>
      <Text style={styles.title}>
        {hasSquad ? "Create your first Plan!" : "Create a Squad first"}
      </Text>
      <Text style={styles.desc}>
        {hasSquad
          ? "Experience Harbor by creating a plan. We've pre-filled a template to get you started in seconds."
          : "You need a squad to plan with. Create a squad of friends to get started."}
      </Text>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.dismissBtn]} onPress={handleDismiss}>
          <Text style={styles.dismissText}>Later</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => {
            if (hasSquad) {
              // Route to plan creation with preset
              router.push("/plan/create?preset=first_plan" as any);
            } else {
              // Route to squad creation
              router.push("/squad/create" as any);
            }
          }}
        >
          <Text style={styles.primaryText}>
            {hasSquad ? "3-Tap Create" : "Create Squad"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}