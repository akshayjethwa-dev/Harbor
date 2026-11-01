// src/components/common/Toast.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface ToastProps {
  message: string;
  visible: boolean;
  duration?: number;
  onHide?: () => void;
}

export default function Toast({
  message,
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, opacity, onHide]);

  if (!visible) return null;

  // Web accessibility: use aria-live
  const webAccessibilityProps =
    Platform.OS === "web"
      ? ({
          "aria-live": "polite",
          role: "status",
        } as any)
      : {};

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
        },
      ]}
      // Native accessibility: polite live region (won't steal focus)
      accessibilityLiveRegion="polite"
      accessible
      {...webAccessibilityProps}
    >
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});