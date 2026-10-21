import "../src/lib/reactPolyfills";
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import ErrorBoundary from "../src/components/ErrorBoundary";
import OfflineBanner from "../src/components/common/OfflineBanner";
import { useNotifications } from "../src/hooks/useNotifications";
import { attachDeepLinkHandler } from "../src/services/deepLinkService";
import { initSentry, setSentryUser, clearSentryUser } from "../src/lib/sentry";
import { initI18n } from "../src/i18n";
import { getLatestLegalDoc } from "../src/services/legalService";
import ConsentModal from "../src/components/legal/ConsentModal";
import RestoreAccountModal from "../src/components/auth/RestoreAccountModal";

initSentry();

function AppBootstrap() {
  const { user } = useAuth();

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
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [consentReq, setConsentReq] = useState<{ type: "privacy" | "terms"; version: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    // FIX: Cast segments[0] as string to avoid TS error on strict route types
    const inAuthGroup = (segments[0] as string) === "(auth)";
    const inOnboarding = (segments[0] as string) === "onboarding";
    
    if (!inAuthGroup && !inOnboarding && !user.hasSeenOnboarding) {
      router.replace("/onboarding" as any);
    }
  }, [user, segments, router]);

  useEffect(() => {
    if (!user) {
      setConsentReq(null);
      return;
    }

    if (user.isDeleted || !user.hasSeenOnboarding) return;

    const checkConsent = async () => {
      try {
        const privacyDoc = await getLatestLegalDoc("privacy");
        if (privacyDoc && user.acceptedPrivacyVersion !== privacyDoc.version) {
          setConsentReq({ type: "privacy", version: privacyDoc.version });
          return;
        }

        const termsDoc = await getLatestLegalDoc("terms");
        if (termsDoc && user.acceptedTermsVersion !== termsDoc.version) {
          setConsentReq({ type: "terms", version: termsDoc.version });
          return;
        }

        setConsentReq(null);
      } catch (e) {
        console.warn("Failed to check legal consent", e);
      }
    };

    checkConsent();
  }, [user]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AppBootstrap />
      <OfflineBanner />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="search" />
        <Stack.Screen name="referral" />
        <Stack.Screen name="plan/create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="plan/[id]" />
        <Stack.Screen name="plan/chat/[id]" />
        <Stack.Screen name="squad/create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="squad/[id]" />
        <Stack.Screen name="invite/create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="invitations/index" />
        <Stack.Screen name="partner/matches" />
        <Stack.Screen name="partner/chat/[id]" />
        <Stack.Screen name="settings/safety" />
        <Stack.Screen name="settings/emergency-contacts" />
        <Stack.Screen name="settings/blocked-users" />
        <Stack.Screen name="settings/disputes" />
        <Stack.Screen name="settings/account" />
        <Stack.Screen name="settings/theme" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="legal/[type]" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="boosts" />
        <Stack.Screen name="templates/index" />
        <Stack.Screen name="vendor/onboarding" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>

      {consentReq && !user?.isDeleted && user?.hasSeenOnboarding && (
        <ConsentModal
          visible={true}
          type={consentReq.type}
          latestVersion={consentReq.version}
          onAccepted={() => setConsentReq(null)}
        />
      )}

      {user?.isDeleted && (
        <RestoreAccountModal
          visible={true}
          onRestored={() => {}}
        />
      )}
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