// app/partner/profile/[uid].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { GarbaCrewUser } from "../../../src/types/user";
import { sendSayHi, hasSaidHi } from "../../../src/services/partnerService";
import { useTheme } from "../../../src/theme/ThemeContext";
import TrustBadge from "../../../src/components/common/TrustBadge";
import ImageCarousel from "../../../src/components/common/ImageCarousel";
import { getActivityMeta } from "../../../src/constants/activities";
import { getPartnerVibe } from "../../../src/constants/partnerVibes";
import { PlanActivity } from "../../../src/types/plan";

export default function PartnerProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<GarbaCrewUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sayingHi, setSayingHi] = useState(false);
  const [alreadySaidHi, setAlreadySaidHi] = useState(false);

  useEffect(() => {
    if (!uid || !user) return;

    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() } as GarbaCrewUser);
        }
        const hiSent = await hasSaidHi(user.uid, uid);
        setAlreadySaidHi(hiSent);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, user]);

  const handleSayHi = async () => {
    if (!user || !profile) return;
    setSayingHi(true);
    try {
      const result = await sendSayHi(user, profile.uid);
      if (result.matched && result.chatId) {
        Alert.alert(
          "It's a match! 🎉",
          "You both want to connect. Opening your chat...",
          [
            {
              text: "OK",
              onPress: () => router.replace(`/partner/chat/${result.chatId}` as any),
            },
          ]
        );
      } else {
        Alert.alert(
          "Say Hi sent!",
          "If they say hi back within 7 days, you'll match and can chat."
        );
        setAlreadySaidHi(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send Say Hi.");
    } finally {
      setSayingHi(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Profile not found.</Text>
      </SafeAreaView>
    );
  }

  // Determine which photos to show
  // Fallback to profile.photos if it exists, otherwise use profile.photoUrl
  const photosToShow = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : profile.photoUrl ? [profile.photoUrl] : [];

  const vibe = getPartnerVibe(profile.partnerVibe);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Photo Carousel */}
        <ImageCarousel 
          images={photosToShow} 
          fallbackInitial={profile.name?.charAt(0)} 
        />

        <View style={styles.content}>
          {/* Name & Verification */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {profile.name}, {profile.age}
            </Text>
            {profile.isVerified && <TrustBadge type="verified" size="md" />}
          </View>

          <Text style={[styles.city, { color: colors.textSecondary }]}>
            📍 {profile.city}
          </Text>

          {/* Trust Badge & Vibe */}
          <View style={styles.badgeRow}>
            {(profile as any).trustBalance !== undefined && (
              <TrustBadge type="trust_score" value={(profile as any).trustBalance} size="md" />
            )}
            {vibe && (
              <View style={[styles.vibeChip, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.vibeText, { color: colors.primary }]}>
                  {vibe.emoji} {vibe.label}
                </Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {profile.bio}
              </Text>
            </View>
          ) : null}

          {/* Activities */}
          {profile.activities && profile.activities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Interests
              </Text>
              <View style={styles.chipRow}>
                {profile.activities.map((a) => {
                  const meta = getActivityMeta(a as PlanActivity);
                  return (
                    <View key={a} style={[styles.chip, { backgroundColor: colors.bgSubtle }]}>
                      <Text style={[styles.chipText, { color: colors.text }]}>
                        {meta.emoji} {meta.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Spacer for the bottom button */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating "Say Hi" Button */}
      <SafeAreaView style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.sayHiBtn,
            { backgroundColor: alreadySaidHi ? colors.bgSubtle : colors.primary },
          ]}
          onPress={handleSayHi}
          disabled={alreadySaidHi || sayingHi}
        >
          {sayingHi ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text
              style={[
                styles.sayHiText,
                { color: alreadySaidHi ? colors.textMuted : colors.textInverse },
              ]}
            >
              {alreadySaidHi ? "Hi Sent ✓" : "Say Hi 👋"}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 20 },
  content: { padding: 24 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 26, fontWeight: "800" },
  city: { fontSize: 16, marginBottom: 16 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  vibeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vibeText: { fontSize: 13, fontWeight: "700" },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
    backgroundColor: "transparent",
  },
  sayHiBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sayHiText: { fontSize: 18, fontWeight: "700" },
});