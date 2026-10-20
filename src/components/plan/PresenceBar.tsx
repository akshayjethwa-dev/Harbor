// src/components/plan/PresenceBar.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { PresenceRecord } from "../../types/presence";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  viewers: PresenceRecord[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: "600",
    marginRight: 12,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.bg, // Matches background to create the "cutout" effect
    marginLeft: -10, // Overlap
    backgroundColor: c.bgSubtle,
    position: "relative",
  },
  avatarFirst: {
    marginLeft: 0,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
  },
  awayBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: c.warning,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.bg,
  },
  awayText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFF",
  },
  moreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.bg,
    marginLeft: -10,
    backgroundColor: c.bgSubtle,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10, // Ensure it stays on top
  },
  moreText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.textSecondary,
  },
});

export default function PresenceBar({ viewers }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  // Exclude current user from the "who else is here" list
  const others = viewers.filter(v => v.uid !== user?.uid);

  if (others.length === 0) return null;

  const displayLimit = 5;
  const displayed = others.slice(0, displayLimit);
  const remaining = others.length - displayLimit;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Viewing now:</Text>
      <View style={styles.avatarStack}>
        {displayed.map((viewer, index) => (
          <View 
            key={viewer.uid} 
            style={[styles.avatarWrapper, index === 0 && styles.avatarFirst]}
          >
            {viewer.photoUrl ? (
              <Image source={{ uri: viewer.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{viewer.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            
            {viewer.status === "away" && (
              <View style={styles.awayBadge}>
                <Text style={styles.awayText}>AWAY</Text>
              </View>
            )}
          </View>
        ))}

        {remaining > 0 && (
          <View style={styles.moreBadge}>
            <Text style={styles.moreText}>+{remaining}</Text>
          </View>
        )}
      </View>
    </View>
  );
}