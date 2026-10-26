import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { auth, db, storage } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useProfileScore } from "../../src/hooks/useProfileScore";
import PartnerModeToggle from "../../src/components/partner/PartnerModeToggle";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";
import BadgeGrid from "../../src/components/profile/BadgeGrid";
import StreakCard from "../../src/components/profile/StreakCard";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 40 },
    header: { alignItems: "center", paddingTop: 24, paddingBottom: 24 },
    avatarWrapper: {
      position: "relative",
      marginBottom: 16,
    },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarInitial: { fontSize: 36, fontWeight: "700", color: c.textMuted },
    cameraBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: c.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: c.bg,
    },
    name: { fontSize: 24, fontWeight: "800", color: c.text },
    city: { fontSize: 15, color: c.textSecondary, marginTop: 4 },
    verifiedBadge: {
      backgroundColor: c.success + "22",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 8,
    },
    verifiedText: { fontSize: 13, color: c.success, fontWeight: "600" },
    scoreSection: { paddingHorizontal: 24, marginBottom: 24 },
    scoreCircle: {
      alignSelf: "center",
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 6,
      borderColor: c.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    scoreNumber: { fontSize: 32, fontWeight: "800", color: c.primary },
    scoreLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    tipsContainer: {
      backgroundColor: c.warning + "15",
      borderRadius: 12,
      padding: 16,
    },
    tipsTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.warning,
      marginBottom: 8,
    },
    tipText: { fontSize: 14, color: c.textSecondary, lineHeight: 22 },
    scoresRow: {
      flexDirection: "row",
      paddingHorizontal: 24,
      gap: 12,
      marginBottom: 24,
    },
    scoreCard: {
      flex: 1,
      backgroundColor: c.bgElevated,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },
    scoreCardLabel: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
    scoreCardValue: { fontSize: 22, fontWeight: "800", color: c.text },
    safetyLink: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 24,
      marginBottom: 12,
      padding: 16,
      backgroundColor: c.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    safetyLinkIcon: { fontSize: 24, marginRight: 12 },
    safetyLinkTitle: { fontSize: 15, fontWeight: "700", color: c.text },
    safetyLinkSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    safetyLinkChevron: { fontSize: 24, color: c.textMuted },
    signOutButton: {
      marginHorizontal: 24,
      marginTop: 16,
      borderWidth: 1.5,
      borderColor: c.danger,
      borderRadius: 14,
      height: 52,
      justifyContent: "center",
      alignItems: "center",
    },
    signOutText: { fontSize: 16, fontWeight: "700", color: c.danger },
    fallbackContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.bg,
    },
    fallbackButton: {
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: c.primary,
      borderRadius: 12,
    },
    fallbackText: {
      color: c.textInverse,
      fontWeight: "700",
      fontSize: 16,
    },
  });

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { score, tips } = useProfileScore(user);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [uploading, setUploading] = useState(false);

  const availabilityCount = user?.availability
    ? Object.keys(user.availability).length
    : 0;
  const availabilitySub =
    availabilityCount > 0
      ? `${availabilityCount} slot${availabilityCount === 1 ? "" : "s"} set`
      : "Set your weekly free/busy slots";

  // ─────────────────────────────────────────────────────────
  // Web-Compatible Alert Helper
  // ─────────────────────────────────────────────────────────
  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === "web") {
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const confirmBtn = buttons.find((b) => b.style === "destructive" || b.text === "Sign Out");
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        }
      } else {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Image Upload Logic
  // ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert("Permission Required", "You need to allow access to your photos to upload a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      showAlert("Error", "Could not open image picker.");
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      
      const downloadUrl = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, "users", user.uid), {
        photoUrl: downloadUrl,
      });

      showAlert("Success", "Profile picture updated!");
    } catch (error: any) {
      console.error("[uploadImage] failed:", error);
      showAlert("Upload Failed", error.message ?? "Could not upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const performSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to sign out.");
    }
  };

  const handleSignOut = () => {
    showAlert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: performSignOut },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.fallbackContainer}>
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.fallbackText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={pickImage} 
            disabled={uploading}
            activeOpacity={0.8}
          >
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            
            {/* Camera Badge Overlay */}
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.textInverse} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{user.name || "Your Name"}</Text>
          <Text style={styles.city}>{user.city || "Add your city"}</Text>

          {user.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✅ Verified</Text>
            </View>
          )}
        </View>

        {/* ─── Partner Mode toggle ─── */}
        <PartnerModeToggle />

        {/* ─── Profile Score ─── */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>Profile Score</Text>
          </View>

          {tips.length > 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips to improve</Text>
              {tips.map((tip, i) => (
                <Text key={i} style={styles.tipText}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* ─── Task 53: Streaks ─── */}
        <StreakCard />

        {/* ─── Task 51: Badges ─── */}
        <BadgeGrid badges={user.badges || []} />

        {/* ─── Scores ─── */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Host Score</Text>
            <Text style={styles.scoreCardValue}>{user.hostScore ?? 50}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Guest Score</Text>
            <Text style={styles.scoreCardValue}>{user.guestScore ?? 50}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Trust Balance</Text>
            <Text style={styles.scoreCardValue}>{user.trustBalance ?? 50}</Text>
          </View>
        </View>

        {/* ─── Wallet ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/wallet" as any)}
        >
          <Text style={styles.safetyLinkIcon}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Wallet</Text>
            <Text style={styles.safetyLinkSub}>
              Earnings, subscription, and boosts
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── My Templates ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/templates" as any)}
        >
          <Text style={styles.safetyLinkIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>My Templates</Text>
            <Text style={styles.safetyLinkSub}>
              Reuse recurring Plan shapes
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Availability (Task 1) ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/settings/availability" as any)}
        >
          <Text style={styles.safetyLinkIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Availability</Text>
            <Text style={styles.safetyLinkSub}>{availabilitySub}</Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Offline Itineraries (Task 29) ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/offline" as any)}
        >
          <Text style={styles.safetyLinkIcon}>📥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Offline Itineraries</Text>
            <Text style={styles.safetyLinkSub}>
              Access plans without internet
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Invite friends ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/referral" as any)}
        >
          <Text style={styles.safetyLinkIcon}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Invite friends</Text>
            <Text style={styles.safetyLinkSub}>
              Give +10, Get +10 Trust Balance
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Trust & Safety ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/settings/safety" as any)}
        >
          <Text style={styles.safetyLinkIcon}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Trust & Safety</Text>
            <Text style={styles.safetyLinkSub}>
              Emergency contacts, blocked users, disputes
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Task 48: How to use Kithra ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/onboarding" as any)}
        >
          <Text style={styles.safetyLinkIcon}>🎓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>How to use Kithra</Text>
            <Text style={styles.safetyLinkSub}>Replay the guided tour</Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Appearance ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/settings/theme" as any)}
        >
          <Text style={styles.safetyLinkIcon}>🎨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Appearance</Text>
            <Text style={styles.safetyLinkSub}>Light, dark, or system</Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Language ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/settings/language" as any)}
        >
          <Text style={styles.safetyLinkIcon}>🌐</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Language</Text>
            <Text style={styles.safetyLinkSub}>English, हिन्दी, ગુજરાતી</Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Account & privacy ─── */}
        <TouchableOpacity
          style={styles.safetyLink}
          onPress={() => router.push("/settings/account" as any)}
        >
          <Text style={styles.safetyLinkIcon}>⚙️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyLinkTitle}>Account & privacy</Text>
            <Text style={styles.safetyLinkSub}>
              Data export, delete account
            </Text>
          </View>
          <Text style={styles.safetyLinkChevron}>›</Text>
        </TouchableOpacity>

        {/* ─── Sign Out ─── */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}