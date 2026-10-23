// src/components/auth/GoogleSignInButton.tsx
import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { signInWithGoogle, signInWithGoogleWeb } from "../../services/authService";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

if (!WEB_CLIENT_ID) {
  console.warn(
    "[GoogleSignInButton] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty. " +
      "Google sign-in will fail."
  );
}

// Configure the native Google Sign-In SDK
GoogleSignin.configure({
  // Use the Web Client ID here, NOT the Android Client ID
  webClientId: WEB_CLIENT_ID,
  offlineAccess: false,
});

export default function GoogleSignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const handleNativeSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Support for newer versions of the library
      const idToken = (userInfo as any).data?.idToken || (userInfo as any).idToken;

      if (!idToken) {
        Alert.alert("Sign-In Failed", "Could not retrieve ID token.");
        return;
      }

      const result = await signInWithGoogle(idToken);
      handleResult(result);

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the flow, do nothing
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available or outdated.");
      } else {
        Alert.alert("Error", error.message || "An unknown error occurred.");
        console.error("[GoogleSignIn Error]", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWebSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogleWeb();
    setLoading(false);
    handleResult(result);
  };

  const onPress = () => {
    if (Platform.OS === "web") {
      handleWebSignIn();
    } else {
      handleNativeSignIn();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator />
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