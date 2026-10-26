// src/components/KeyboardAwareScrollView.tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props extends Omit<ScrollViewProps, 'contentContainerStyle'> {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle | ViewStyle[];
  /**
   * Extra space to add at the bottom of the scroll content.
   * Useful when a fixed footer / sticky button sits below the scroll view.
   */
  extraBottomPadding?: number;
  /**
   * Set to true if the screen sits inside a tab navigator and you want the
   * tab bar to hide while the keyboard is open (recommended for chat & forms).
   */
  keyboardOffset?: number;
}

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  extraBottomPadding = 0,
  keyboardOffset = 0,
  ...scrollProps
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // iOS: pad so the ScrollView resizes above the keyboard.
      // Android: leave undefined — app.json `softwareKeyboardLayoutMode: "resize"`
      // already resizes the window, and adding `padding`/`height` here causes
      // double-resizing bugs.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingBottom: insets.bottom + 32 + extraBottomPadding,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});