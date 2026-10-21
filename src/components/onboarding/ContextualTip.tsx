// src/components/onboarding/ContextualTip.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  id: string; // Unique ID for this tip
  text: string;
  icon?: string;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: c.warning + "15", borderColor: c.warning, borderWidth: 1,
    padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center",
    marginBottom: 16,
  },
  icon: { fontSize: 20, marginRight: 12 },
  text: { flex: 1, fontSize: 13, color: c.text, lineHeight: 18 },
  closeBtn: { padding: 8, marginLeft: 8 },
  closeText: { fontSize: 16, color: c.textMuted, fontWeight: "700" },
});

export default function ContextualTip({ id, text, icon = "💡" }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`tip_dismissed_${id}`).then((val) => {
      if (!val) setVisible(true);
    });
  }, [id]);

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(`tip_dismissed_${id}`, "true");
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}