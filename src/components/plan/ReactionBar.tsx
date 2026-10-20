// src/components/plan/ReactionBar.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { toggleReaction } from "../../services/reactionService";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  planId: string;
  itemId: string;
  collectionName: "tasks" | "expenses";
  reactions?: Record<string, string[]>;
  currentUserId: string;
}

const EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  pillActive: {
    backgroundColor: c.primary + "22",
    borderColor: c.primary,
  },
  emoji: { fontSize: 14 },
  count: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textSecondary,
    marginLeft: 4,
  },
  countActive: { color: c.primary },
});

export default function ReactionBar({
  planId,
  itemId,
  collectionName,
  reactions = {},
  currentUserId,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const [processing, setProcessing] = useState(false);

  const handleToggle = async (emoji: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      await toggleReaction(collectionName, planId, itemId, emoji, currentUserId);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {EMOJIS.map((emoji) => {
        const users = reactions[emoji] || [];
        const count = users.length;
        const isActive = users.includes(currentUserId);

        // Only show emojis that have at least 1 reaction OR all emojis if none exist yet?
        // For a clean UI, we show all 6 pills. Active ones get highlighted.
        return (
          <TouchableOpacity
            key={emoji}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => handleToggle(emoji)}
            disabled={processing}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 0 && (
              <Text style={[styles.count, isActive && styles.countActive]}>
                {count}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}