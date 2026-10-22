// src/components/referral/InvitePromptModal.tsx
import React, { useEffect, useState } from "react";
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert, Share, Platform 
} from "react-native";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Props {
  visible: boolean;
  onClose: () => void;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { backgroundColor: c.bg, borderRadius: 24, padding: 24, width: "100%", maxWidth: 400, alignItems: "center" },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "900", color: c.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: c.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  incentiveBox: { backgroundColor: c.success + "15", padding: 12, borderRadius: 12, marginBottom: 24, width: "100%", alignItems: "center", borderWidth: 1, borderColor: c.success },
  incentiveText: { color: c.success, fontWeight: "700", fontSize: 13 },
  actions: { width: "100%", gap: 12 },
  btn: { width: "100%", padding: 16, borderRadius: 12, alignItems: "center" },
  primaryBtn: { backgroundColor: c.primary },
  primaryText: { color: c.textInverse, fontWeight: "700", fontSize: 16 },
  secondaryBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border },
  secondaryText: { color: c.textSecondary, fontWeight: "700", fontSize: 16 },
  closeBtn: { position: "absolute", top: 16, right: 16, padding: 8 },
  closeText: { fontSize: 20, color: c.textMuted },
});

export default function InvitePromptModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [checking, setChecking] = useState(false);

  // We check if the user was referred by someone else to change the message
  const wasReferred = !!user?.referredBy;

  const handleDismiss = async () => {
    await AsyncStorage.setItem("invite_prompt_dismissed_at", Date.now().toString());
    onClose();
  };

  const getReferralLink = () => {
    // If user has a code, use it. Otherwise, default to the app link.
    const code = user?.referralCode || "Kithra";
    return `https://kithra.app/invite?ref=${code}`;
  };

  const handleShareLink = async () => {
    try {
      const result = await Share.share({
        message: `Join me on Kithra! Let's plan our next adventure. Use my link: ${getReferralLink()}`,
        url: getReferralLink(), // iOS specific
      });
      
      if (result.action === Share.sharedAction) {
        // User successfully shared it! Dismiss for 7 days.
        await handleDismiss();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handlePickContacts = async () => {
    setChecking(true);
    try {
      // 1. Request Permission
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your contacts to invite them.");
        setChecking(false);
        return;
      }

      // 2. Open Contact Picker
      const contact = await Contacts.presentContactPickerAsync();
      
      if (contact && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const phone = contact.phoneNumbers[0].number;
        
        // In a real app, you might trigger an SMS via Twilio here, 
        // or open the native SMS composer. For now, we'll open the Share sheet.
        await Share.share({
          message: `Hey ${contact.name}! Join me on Kithra. Use my link: ${getReferralLink()}`,
        });
        
        await handleDismiss();
      } else if (contact) {
        Alert.alert("No Phone Number", "This contact doesn't have a phone number.");
      }
    } catch (e: any) {
      console.warn("Contact picker failed:", e);
      // Edge Case: Fallback to share link if contacts fail
      handleShareLink();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>Plan Created!</Text>
          <Text style={styles.subtitle}>
            {wasReferred 
              ? "Since a friend invited you, pass it forward! Invite someone to Kithra and get your first bonus."
              : "Kithra is better with friends. Invite them to join your crew and earn rewards."}
          </Text>

          <View style={styles.incentiveBox}>
            <Text style={styles.incentiveText}>
              🎁 Get +10 Trust Balance for every friend who joins!
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btn, styles.primaryBtn]} 
              onPress={handlePickContacts}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryText}>📇 Invite from Contacts</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.secondaryBtn]} 
              onPress={handleShareLink}
              disabled={checking}
            >
              <Text style={styles.secondaryText}>🔗 Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}