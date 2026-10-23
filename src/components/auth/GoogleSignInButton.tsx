// src/components/auth/GoogleSignInButton.tsx
import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { signInWithGoogle, signInWithGoogleWeb } from "../../services/authService";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID ?? "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID ?? "";

export default function GoogleSignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Native hook — only used on iOS/Android. On web we won't call promptAsync.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });

  // Handle native response
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (!id_token) {
        Alert.alert("Sign-In Failed", "Could not retrieve ID token from Google.");
        return;
      }
      handleNativeSignIn(id_token);
    }
    if (response?.type === "error") {
      Alert.alert(
        "Sign-In Error",
        response.error?.message ?? "Google sign-in was cancelled or failed."
      );
    }
  }, [response]);

  const handleNativeSignIn = async (idToken: string) => {
    setLoading(true);
    const result = await signInWithGoogle(idToken);
    setLoading(false);
    handleResult(result);
  };

  const handleWebSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogleWeb();
    setLoading(false);
    handleResult(result);
  };

  const handleResult = (result: {
    user: any;
    needsPhone?: boolean;
    error?: string;
  }) => {
    if (!result.user) {
      Alert.alert("Error", result.error ?? "Google sign-in failed");
      return;
    }
    if (result.needsPhone) {
      Alert.alert(
        "Phone Required",
        "Please add your phone number to continue.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
      return;
    }
    if (result.user.profileComplete) {
      router.replace("/(tabs)/crews");
    } else {
      router.replace("/(auth)/profile-setup");
    }
  };

  const onPress = () => {
    if (Platform.OS === "web") {
      handleWebSignIn();
    } else {
      promptAsync();
    }
  };

  const disabled = loading || (Platform.OS !== "web" && !request);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    height: 56,
  },
  buttonDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4285F4",
    marginRight: 10,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#333" },
});