import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useProfileScore } from "../../src/hooks/useProfileScore";
import PartnerModeToggle from "../../src/components/partner/PartnerModeToggle";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

// ─────────────────────────────────────────────────────────
// Styles factory — receives the current theme's colors
// and returns a StyleSheet. Recomputed on every theme change.
// ─────────────────────────────────────────────────────────
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 40 },
    header: { alignItems: "center", paddingTop: 24, paddingBottom: 24 },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.bgSubtle,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    avatarInitial: { fontSize: 36, fontWeight: "700", color: c.textMuted },
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

  // ─── Availability summary (Task 1) ───
  const availabilityCount = user?.availability
    ? Object.keys(user.availability).length
    : 0;
  const availabilitySub =
    availabilityCount > 0
      ? `${availabilityCount} slot${availabilityCount === 1 ? "" : "s"} set`
      : "Set your weekly free/busy slots";

  const performSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to sign out.");
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      // @ts-ignore
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) performSignOut();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
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
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user.name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
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

        {/* ─── My Tasks ─── */}
<TouchableOpacity
  style={styles.safetyLink}
  onPress={() => router.push("/my-tasks" as any)}
>
  <Text style={styles.safetyLinkIcon}>✅</Text>
  <View style={{ flex: 1 }}>
    <Text style={styles.safetyLinkTitle}>My Tasks</Text>
    <Text style={styles.safetyLinkSub}>
      Things assigned to you across all plans
    </Text>
  </View>
  <Text style={styles.safetyLinkChevron}>›</Text>
</TouchableOpacity>

{/* ─── Notifications ─── */}
<TouchableOpacity
  style={styles.safetyLink}
  onPress={() => router.push("/settings/notifications" as any)}
>
  <Text style={styles.safetyLinkIcon}>🔔</Text>
  <View style={{ flex: 1 }}>
    <Text style={styles.safetyLinkTitle}>Notifications</Text>
    <Text style={styles.safetyLinkSub}>Reminders, digests, and Do Not Disturb</Text>
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