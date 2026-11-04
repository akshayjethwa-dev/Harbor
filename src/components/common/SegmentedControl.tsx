// src/components/common/SegmentedControl.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export default function SegmentedControl({ options, selectedValue, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              isSelected && { backgroundColor: colors.bg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
            ]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.text : colors.textMuted },
                isSelected && styles.labelSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1, // Added a border so it's visible
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  labelSelected: {
    fontWeight: "800",
  },
});