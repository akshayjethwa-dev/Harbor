import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import {
  getOrCreateReferralCode,
  buildReferralMessage,
} from "../src/services/referralService";

export default function ReferralScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await getOrCreateReferralCode();
        setCode(c);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleShare = async () => {
    if (!code) return;
    const message = buildReferralMessage(code, user?.name ?? "a friend");
    try {
      await Share.share({ message, title: "Join GarbaCrew" });
    } catch (e) {
      if (Platform.OS === "web") {
        // Fallback: copy to clipboard
        // @ts-ignore
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          alert("Referral link copied!");
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.heroEmoji}>🎁</Text>
        <Text style={styles.heroTitle}>Give +10, Get +10</Text>
        <Text style={styles.heroSub}>
          When a friend signs up with your code, you both get +10 Trust Balance.
        </Text>

        {loading ? (
          <ActivityIndicator color="#E91E63" style={{ marginTop: 32 }} />
        ) : !code ? (
          <Text style={{ color: "#666", marginTop: 32 }}>
            Could not generate code. Try again later.
          </Text>
        ) : (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Your referral code</Text>
              <Text style={styles.code}>{code}</Text>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareText}>Share invite</Text>
            </TouchableOpacity>

            <Text style={styles.stats}>
              You've invited {user?.referralCount ?? 0} friend
              {user?.referralCount === 1 ? "" : "s"} so far.
            </Text>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Max 20 referrals per account. Bonus credited instantly when
                your friend redeems the code.
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  body: { flex: 1, paddingHorizontal: 32, paddingTop: 32, alignItems: "center" },
  heroEmoji: { fontSize: 72, marginBottom: 16 },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#1A1A1A", textAlign: "center" },
  heroSub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 32,
  },
  codeBox: {
    backgroundColor: "#FFF0F5",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderWidth: 1.5,
    borderColor: "#F8BBD0",
    marginBottom: 24,
  },
  codeLabel: { fontSize: 12, color: "#999", textAlign: "center", marginBottom: 8 },
  code: {
    fontSize: 32,
    fontWeight: "900",
    color: "#E91E63",
    letterSpacing: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  shareBtn: {
    backgroundColor: "#E91E63",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  shareText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  stats: { fontSize: 13, color: "#666", marginBottom: 24 },
  noteBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    maxWidth: 320,
  },
  noteText: { fontSize: 12, color: "#666", textAlign: "center", lineHeight: 18 },
});