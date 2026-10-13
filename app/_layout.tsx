import "../src/lib/reactPolyfills";
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import ErrorBoundary from "../src/components/ErrorBoundary";
import OfflineBanner from "../src/components/common/OfflineBanner";
import { useNotifications } from "../src/hooks/useNotifications";
import { attachDeepLinkHandler } from "../src/services/deepLinkService";
import { initSentry, setSentryUser, clearSentryUser } from "../src/lib/sentry";
import { initI18n } from "../src/i18n";

// Sentry: safe to init at module level (has its own SSR guard)
initSentry();

function AppBootstrap() {
  const { user } = useAuth();

  // ─────────────────────────────────────────────────────────
  // i18n init — moved into useEffect so it only runs on the client
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    initI18n().catch((err) => {
      console.warn("[i18n] init failed:", err);
    });
  }, []);

  useNotifications();

  useEffect(() => {
    const cleanup = attachDeepLinkHandler();
    return cleanup;
  }, []);

  useEffect(() => {
    if (user) setSentryUser(user.uid, user.email);
    else clearSentryUser();
  }, [user]);

  return null;
}

function RootWithTheme() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AppBootstrap />
      <OfflineBanner />

      <Stack screenOptions={{ headerShown: false }}>
        {/* ─── Entry point ─── */}
        <Stack.Screen name="index" />

        {/* ─── Standalone screens ─── */}
        <Stack.Screen name="search" />
        <Stack.Screen name="referral" />

        {/* ─── Plan flows ─── */}
        <Stack.Screen
          name="plan/create"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="plan/[id]" />
        <Stack.Screen name="plan/chat/[id]" />

        {/* ─── Squad flows ─── */}
        <Stack.Screen
          name="squad/create"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="squad/[id]" />

        {/* ─── Invitation flows ─── */}
        <Stack.Screen
          name="invite/create"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="invitations/index" />

        {/* ─── Partner discovery ─── */}
        <Stack.Screen name="partner/matches" />
        <Stack.Screen name="partner/chat/[id]" />

        {/* ─── Settings ─── */}
        <Stack.Screen name="settings/safety" />
        <Stack.Screen name="settings/emergency-contacts" />
        <Stack.Screen name="settings/blocked-users" />
        <Stack.Screen name="settings/disputes" />
        <Stack.Screen name="settings/account" />
        <Stack.Screen name="settings/theme" />
        <Stack.Screen name="settings/language" />

        {/* ─── Monetization ─── */}
        <Stack.Screen name="wallet" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="boosts" />

        {/* ─── Templates ─── */}
        <Stack.Screen name="templates/index" />

        {/* ─── Vendor onboarding ─── */}
        <Stack.Screen
          name="vendor/onboarding"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />

        {/*
          Note: The `(auth)` and `(tabs)` groups are NOT declared here.
          Expo Router auto-registers them from their own `_layout.tsx` files.
          Declaring them as <Stack.Screen> causes the "[Layout children]" warning.
        */}
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});