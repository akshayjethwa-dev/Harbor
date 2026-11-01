import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import OTPInput from "../../src/components/auth/OTPInput";
import { verifyOTP } from "../../src/services/authService";

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleComplete = useCallback(
    async (code: string) => {
      setLoading(true);
      setError("");
      const result = await verifyOTP(params.verificationId, code);
      setLoading(false);

      if (result.user) {
        if (result.user.profileComplete) {
          router.replace("/(tabs)/crews");
        } else {
          // Route new users to the Intent Selection screen.
          router.replace("/onboarding/intent" as any);
        }
      } else {
        setError(result.error || "Verification failed. Try again.");
      }
    },
    [params.verificationId, router]
  );

  const handleResend = () => {
    setCountdown(30);
    setError("");
    router.back();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={styles.phone}>{params.phone}</Text>
        </Text>

        <OTPInput
          length={6}
          onComplete={handleComplete}
          onResend={handleResend}
          resendCountdown={countdown}
          error={error}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", paddingHorizontal: 24 },
  backButton: { marginTop: 60, marginBottom: 20 },
  backText: { fontSize: 16, color: "#E91E63", fontWeight: "600" },
  content: { alignItems: "center", marginTop: 40 },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", marginBottom: 12 },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  phone: { fontWeight: "700", color: "#1A1A1A" },
});