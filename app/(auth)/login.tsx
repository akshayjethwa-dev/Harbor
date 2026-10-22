import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { FirebasePhoneCaptchaModal } from "expo-firebase-phone-auth-recaptcha";
import PhoneInput from "../../src/components/auth/PhoneInput";
import GoogleSignInButton from "../../src/components/auth/GoogleSignInButton";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  // State to trigger the reCAPTCHA modal
  const [captchaPhoneNumber, setCaptchaPhoneNumber] = useState("");

  const validatePhone = (): boolean => {
    if (!phone || phone.length < 10) {
      setPhoneError("Please enter a valid 10-digit phone number");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleContinue = () => {
    if (!validatePhone()) return;
    const fullPhone = `${countryCode}${phone}`;
    // Opening the modal automatically sends the OTP
    setCaptchaPhoneNumber(fullPhone);
  };

  const handleVerificationId = (verificationId: string) => {
    setCaptchaPhoneNumber("");
    router.push({
      pathname: "/(auth)/otp",
      params: { phone: `${countryCode}${phone}`, verificationId },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>🪩</Text>
        <Text style={styles.title}>Welcome to Kithra</Text>
        <Text style={styles.subtitle}>Find your crew. Join the celebration.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            countryCode={countryCode}
            onCountryChange={setCountryCode}
            error={phoneError}
          />

          <TouchableOpacity
            style={[styles.continueButton, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton />
        </View>
      </View>

      {/* ✅ WebView-based reCAPTCHA modal */}
      <FirebasePhoneCaptchaModal
        visible={!!captchaPhoneNumber}
        phoneNumber={captchaPhoneNumber}
        firebaseConfig={{
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
        }}
        onVerificationId={handleVerificationId}
        onExpired={() => {
          setCaptchaPhoneNumber("");
          Alert.alert("Expired", "The captcha expired. Please try again.");
        }}
        onError={(err: any) => {
          setCaptchaPhoneNumber("");
          Alert.alert("Error", err?.message || "Failed to send OTP");
        }}
        onClose={() => setCaptchaPhoneNumber("")}
      />

      <Text style={styles.terms}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 40 },
  form: { width: "100%" },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  continueButton: {
    backgroundColor: "#E91E63",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  continueText: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },
  dividerText: { marginHorizontal: 16, color: "#999", fontSize: 14 },
  terms: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
});