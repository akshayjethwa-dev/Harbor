// src/components/common/Button.tsx
import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, Typography } from '../../constants/theme';
// ✅ Import accessible color
import { A11Y_PRIMARY_PINK } from '../../lib/a11y'; 

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: Props) {
  const { colors } = useTheme();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const lastPressRef = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    if (isDebouncing || disabled || loading) return;
    if (now - lastPressRef.current < 500) return;
    lastPressRef.current = now;

    setIsDebouncing(true);
    onPress();
    setTimeout(() => setIsDebouncing(false), 500);
  };

  const isIOS = Platform.OS === 'ios';
  const minHeight = isIOS ? 44 : 48;

  const getBackgroundColor = () => {
    if (disabled || loading) return colors.bgSubtle;
    // ✅ Use accessible pink for primary buttons
    if (variant === 'primary') return A11Y_PRIMARY_PINK; 
    if (variant === 'secondary') return colors.bgSubtle;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled || loading) return colors.textMuted;
    if (variant === 'primary') return '#FFFFFF'; // White text on accessible pink
    if (variant === 'outline') return colors.primary;
    return colors.text;
  };

  const getBorder = () => {
    if (variant === 'outline') {
      return { borderWidth: 1.5, borderColor: colors.primary };
    }
    return {};
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading || isDebouncing}
      style={[
        styles.container,
        { minHeight, backgroundColor: getBackgroundColor() },
        getBorder(),
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={title}
      // ✅ Let screen reader know if the button is disabled or busy
      accessibilityState={{ 
        disabled: disabled || isDebouncing, 
        busy: loading 
      }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), marginLeft: icon ? Spacing.sm : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.sm,
  },
  text: {
    ...Typography.headline,
    fontWeight: '600',
    textAlign: 'center',
  },
});