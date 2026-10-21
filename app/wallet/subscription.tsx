// app/wallet/subscription.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { subscribeToSubscription, changeSubscriptionTier } from "../../src/services/monetizationService";
import { Subscription } from "../../src/types/subscription";
import SubscriptionManager from "../../src/components/wallet/SubscriptionManager";
import { useTheme } from "../../src/theme/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";
import { ThemeColors } from "../../src/theme/colors";

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { fontSize: 22, color: c.text },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSubscription(user.uid, (data) => {
      setSub(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleUpgrade = async (tier: "plus" | "pro" | "host") => {
    if (!user) return;
    try {
      const checkoutUrl = await changeSubscriptionTier(user.uid, tier);
      if (await Linking.canOpenURL(checkoutUrl)) {
        Linking.openURL(checkoutUrl);
      } else {
        Alert.alert("Error", "Could not open checkout page.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const promptUpgrade = () => {
    Alert.alert(
      "Choose Plan",
      "Upgrade to unlock premium features. Upgrades are prorated.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Plus (₹299/mo)", onPress: () => handleUpgrade("plus") },
        { text: "Pro (₹349/mo)", onPress: () => handleUpgrade("pro") },
        { text: "Host (₹499/mo)", onPress: () => handleUpgrade("host") },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <View style={styles.content}>
          <SubscriptionManager sub={sub} uid={user?.uid || ""} onUpgradePress={promptUpgrade} />
        </View>
      )}
    </SafeAreaView>
  );
}