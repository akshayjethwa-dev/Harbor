// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, type TextStyle } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs'; // SDK 57
// import { NativeTabs } from 'expo-router/native-tabs';        // SDK 58+

import { useAuth } from '../../src/context/AuthContext';
import { useUnreadCounts } from '../../src/hooks/useUnreadCounts';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const { user } = useAuth();
  const counts = useUnreadCounts();
  const { colors } = useTheme();
  const showPartners = user?.lookingForPartner === true;

  // Edge case: hide the native tab bar when the keyboard is open.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ✅ FIX #1 — explicitly type fontWeight as TextStyle['fontWeight']
  // so '600' stays a literal instead of widening to `string`.
  const labelStyle: { fontSize: number; fontWeight: TextStyle['fontWeight'] } = {
    fontSize: Platform.OS === 'ios' ? 10 : 12,
    fontWeight: '600',
  };

  return (
    <NativeTabs
      hidden={keyboardVisible}
      labelStyle={labelStyle}
      labelVisibilityMode="labeled"
      tintColor={colors.primary}
      iconColor={{
        default: colors.textMuted,
        selected: colors.primary,
      }}
    >
      {/* ---------- Discover (index) ---------- */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="safari" md="explore" />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge>
          {counts.plans > 0 ? String(counts.plans) : undefined}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      {/* ---------- Squads ---------- */}
      <NativeTabs.Trigger name="squads">
        <NativeTabs.Trigger.Icon sf="person.3" md="groups" />
        <NativeTabs.Trigger.Label>Squads</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* ---------- Trust ---------- */}
      <NativeTabs.Trigger name="trust">
        <NativeTabs.Trigger.Icon sf="shield" md="shield" />
        <NativeTabs.Trigger.Label>Trust</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* ---------- Profile ---------- */}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* ---------- Partners (conditional) ---------- */}
      {showPartners && (
        <NativeTabs.Trigger name="partners">
          {/* ✅ FIX #2 — 'handshake' is not an SF Symbol. */}
          {/* iOS uses person.2.fill (iOS 13+), Android keeps handshake. */}
          <NativeTabs.Trigger.Icon sf="person.2.fill" md="handshake" />
          <NativeTabs.Trigger.Label>Partners</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Badge>
            {counts.partners > 0 ? String(counts.partners) : undefined}
          </NativeTabs.Trigger.Badge>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}