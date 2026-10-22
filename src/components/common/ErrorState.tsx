// src/components/common/ErrorState.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export type AppError = {
  id: string;
  type: 'network' | 'location' | 'generic';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type Props = {
  errors: AppError[];
  onDismiss: (id: string) => void;
};

export default function ErrorState({ errors, onDismiss }: Props) {
  const { colors } = useTheme();

  if (!errors || errors.length === 0) return null;

  return (
    <View style={styles.container}>
      {errors.map((error) => {
        // Determine colors based on error type
        const isNetwork = error.type === 'network';
        
        // ✅ FIXED: Removed `colors.warningText` and used a safe fallback
        const bgColor = isNetwork ? '#FFEBEE' : '#FFF8E1'; // Light red vs Light amber
        const borderColor = isNetwork ? '#FFCDD2' : '#FFE082';
        const textColor = isNetwork ? '#D32F2F' : '#B78103'; // Deep red vs Dark amber

        const iconName = isNetwork 
          ? 'cloud-offline-outline' 
          : error.type === 'location' 
            ? 'location-outline' 
            : 'warning-outline';

        return (
          <View
            key={error.id}
            style={[
              styles.banner,
              { backgroundColor: bgColor, borderColor: borderColor },
            ]}
          >
            <View style={styles.content}>
              <Ionicons name={iconName as any} size={20} color={textColor} />
              <Text style={[styles.message, { color: textColor }]}>
                {error.message}
              </Text>
            </View>

            <View style={styles.actions}>
              {error.actionLabel && error.onAction && (
                <TouchableOpacity
                  onPress={error.onAction}
                  style={[styles.actionBtn, { backgroundColor: textColor }]}
                >
                  <Text style={styles.actionBtnText}>{error.actionLabel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onDismiss(error.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8, // Stacks multiple errors cleanly
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});