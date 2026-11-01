// src/components/discover/TodayPicksSection.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useDailyRecommendations } from "../../hooks/useDailyRecommendations";
import PickCard from "./PickCard";
import WhyThisSheet from "./WhyThisSheet";
import { Recommendation } from "../../services/recommendationService";

export default function TodayPicksSection() {
  const { colors } = useTheme();
  const { plans, partners, loading, dismiss } = useDailyRecommendations();
  const [whyVisible, setWhyVisible] = useState(false);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);

  const allPicks = [...plans, ...partners];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (allPicks.length === 0) {
    return null; // fallback to standard feed; no empty state dead end
  }

  const handleWhyThis = (signals: string[]) => {
    setSelectedSignals(signals);
    setWhyVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Picks</Text>
      <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
        Curated for you
      </Text>
      {allPicks.map((rec) => (
        <PickCard
          key={`${rec.type}-${rec.id}`}
          recommendation={rec}
          onDismiss={() => dismiss(rec.id)}
          onWhyThis={() => handleWhyThis(rec.signals)}
        />
      ))}
      <WhyThisSheet
        visible={whyVisible}
        signals={selectedSignals}
        onClose={() => setWhyVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
});