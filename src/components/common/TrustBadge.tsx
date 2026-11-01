// src/components/common/TrustBadge.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { ThemeColors } from "../../theme/colors";

export type TrustBadgeType = "verified" | "host_score" | "guest_score" | "streak" | "trust_score";
export type TrustBadgeSize = "sm" | "md" | "lg";

interface TrustBadgeProps {
  type: TrustBadgeType;
  value?: string | number;
  size?: TrustBadgeSize;
}

export default function TrustBadge({
  type,
  value,
  size = "md",
}: TrustBadgeProps) {
  const { colors, isDark } = useTheme();

  // ─────────────────────────────────────────────────────────
  // Size Mapping
  // ─────────────────────────────────────────────────────────
  const sizeConfig = {
    sm: { icon: 12, font: 10, padH: 6, padV: 2, gap: 4 },
    md: { icon: 14, font: 12, padH: 8, padV: 4, gap: 6 },
    lg: { icon: 18, font: 14, padH: 12, padV: 6, gap: 8 },
  }[size];

  // ─────────────────────────────────────────────────────────
  // Theme-aware Variant Mapping
  // ─────────────────────────────────────────────────────────
  const variants: Record<
    TrustBadgeType,
    {
      icon: keyof typeof Ionicons.glyphMap;
      iconColor: string;
      bgColor: string;
      textColor: string;
      label: string;
      format: (v?: string | number) => string;
    }
  > = {
    verified: {
      icon: "checkmark-circle",
      iconColor: isDark ? "#4CAF50" : "#1DA1F2",
      bgColor: isDark ? "#1A2E1A" : "#E3F2FD",
      textColor: isDark ? "#81C784" : "#0D47A1",
      label: "Verified user",
      format: () => "Verified",
    },
    host_score: {
      icon: "star",
      iconColor: isDark ? "#FFB300" : "#F57C00",
      bgColor: isDark ? "#2E2A1A" : "#FFF8E1",
      textColor: isDark ? "#FFCA28" : "#E65100",
      label: "Host score",
      format: (v) => `${Number(v).toFixed(1)} / 5`,
    },
    guest_score: {
      icon: "people",
      iconColor: isDark ? "#4DD0E1" : "#0288D1",
      bgColor: isDark ? "#1A2E33" : "#E1F5FE",
      textColor: isDark ? "#80DEEA" : "#01579B",
      label: "Guest score",
      format: (v) => `${Number(v).toFixed(1)} / 5`,
    },
    trust_score: {
      icon: "shield-checkmark",
      iconColor: isDark ? "#81C784" : "#2E7D32",
      bgColor: isDark ? "#1A2E1A" : "#E8F5E9",
      textColor: isDark ? "#A5D6A7" : "#1B5E20",
      label: "Trust Balance",
      format: (v) => `Trust ${v}`,
    },
    streak: {
      icon: "flame",
      iconColor: isDark ? "#FF7043" : "#E64A19",
      bgColor: isDark ? "#331E17" : "#FBE9E7",
      textColor: isDark ? "#FF8A65" : "#BF360C",
      label: "Activity streak",
      format: (v) => `${v} day streak`,
    },
  };

  const config = variants[type];

  // Degrade gracefully if score/streak has no valid value
  if (type !== "verified" && (value === undefined || value === null || value === 0)) {
    return null;
  }

  const displayText = config.format(value);

  // Combine the label and the value for screen readers
  const a11yLabel =
    type === "verified" ? config.label : `${config.label} ${value}`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: sizeConfig.padH,
          paddingVertical: sizeConfig.padV,
          gap: sizeConfig.gap,
          borderRadius: sizeConfig.font * 1.5,
        },
      ]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <Ionicons
        name={config.icon}
        size={sizeConfig.icon}
        color={config.iconColor}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: sizeConfig.font,
            lineHeight: sizeConfig.font * 1.2,
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
  },
});