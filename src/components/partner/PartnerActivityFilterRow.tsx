// src/components/partner/PartnerActivityFilterRow.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { usePartnerFiltersStore } from "../../store/partnerFiltersStore";
import { useTheme } from "../../theme/ThemeContext";
import { ACTIVITIES } from "../../constants/activities"; // Adjust path if needed
import { PlanActivity } from "../../types/plan";

export default function PartnerActivityFilterRow() {
  const { colors } = useTheme();
  const { filters, setFilters } = usePartnerFiltersStore();

  // Filter out 'custom' for a cleaner set of options
  const filterableActivities = ACTIVITIES.filter((a) => a.value !== "custom");

  const toggleActivity = (activityValue: string) => {
    const isSelected = filters.activities.includes(activityValue);
    let newActivities: string[];

    if (isSelected) {
      // Deselect: remove from array
      newActivities = filters.activities.filter((a) => a !== activityValue);
    } else {
      // Select: add to array
      newActivities = [...filters.activities, activityValue];
    }

    // Update the global store, which will trigger a re-fetch of candidates
    setFilters({ activities: newActivities });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterableActivities.map((activity) => {
          const isSelected = filters.activities.includes(activity.value);
          return (
            <TouchableOpacity
              key={activity.value}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleActivity(activity.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {activity.emoji} {activity.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});