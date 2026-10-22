// src/components/plan/CategoryPills.tsx
import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { ACTIVITIES } from '../../constants/activities';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';

type Props = {
  selected: string | null;
  onSelect: (value: string | null) => void;
};

export default function CategoryPills({ selected, onSelect }: Props) {
  const { colors } = useTheme();
  const chipHeight = Platform.OS === 'ios' ? 44 : 48;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={120}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
          style={[
            styles.pill,
            {
              height: chipHeight,
              backgroundColor: selected === null ? colors.primary : colors.bgSubtle,
              borderColor: selected === null ? colors.primary : colors.border,
            },
          ]}
          hitSlop={{ top: 4, bottom: 4 }}
          // ✅ Accessibility additions
          accessibilityRole="button"
          accessibilityState={{ selected: selected === null }}
          accessibilityLabel="Show all plans"
        >
          <Text
            numberOfLines={1}
            style={[
              styles.pillText,
              { color: selected === null ? '#fff' : colors.text },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {ACTIVITIES.map((a) => {
          const active = selected === a.value;
          return (
            <TouchableOpacity
              key={a.value}
              onPress={() => onSelect(active ? null : a.value)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                {
                  height: chipHeight,
                  backgroundColor: active ? colors.primary : colors.bgSubtle,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              hitSlop={{ top: 4, bottom: 4 }}
              // ✅ Accessibility additions
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter by ${a.label}`}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.pillText,
                  {
                    color: active ? '#fff' : colors.text,
                  },
                ]}
              >
                {a.emoji} {a.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.sm },
  pill: {
    minWidth: 72,
    maxWidth: 120,
    paddingHorizontal: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { 
    ...Typography.subhead, 
    fontWeight: '600' 
  },
});