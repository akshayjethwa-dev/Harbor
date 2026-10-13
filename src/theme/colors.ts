export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgElevated: string;
  bgSubtle: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Border
  border: string;
  borderStrong: string;

  // Brand
  primary: string;
  primaryDark: string;
  primarySubtle: string;

  // Status
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Overlays
  overlay: string;
  shimmer: string;
}

export const LIGHT: ThemeColors = {
  bg: "#FFFFFF",
  bgElevated: "#FAFAFA",
  bgSubtle: "#F5F5F5",

  text: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  textInverse: "#FFFFFF",

  border: "#F0F0F0",
  borderStrong: "#E0E0E0",

  primary: "#E91E63",
  primaryDark: "#C2185B",
  primarySubtle: "#FFF0F5",

  success: "#2E7D32",
  warning: "#F57F17",
  danger: "#FF3B30",
  info: "#1565C0",

  overlay: "rgba(0,0,0,0.5)",
  shimmer: "#EEEEEE",
};

export const DARK: ThemeColors = {
  bg: "#0F0F0F",
  bgElevated: "#1A1A1A",
  bgSubtle: "#242424",

  text: "#F5F5F5",
  textSecondary: "#B0B0B0",
  textMuted: "#7A7A7A",
  textInverse: "#0F0F0F",

  border: "#2A2A2A",
  borderStrong: "#3A3A3A",

  primary: "#FF4081",
  primaryDark: "#E91E63",
  primarySubtle: "#2A0F18",

  success: "#66BB6A",
  warning: "#FFB74D",
  danger: "#EF5350",
  info: "#64B5F6",

  overlay: "rgba(0,0,0,0.7)",
  shimmer: "#2A2A2A",
};