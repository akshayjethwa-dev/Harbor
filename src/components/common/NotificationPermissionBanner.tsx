import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const DISMISS_KEY = "@Kithra:notif_banner_dismissed";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.info + "22",
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.info + "44",
      gap: 12,
    },
    emoji: { fontSize: 24 },
    title: { fontSize: 14, fontWeight: "800", color: c.info },
    text: { fontSize: 12, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
    actions: { alignItems: "flex-end", gap: 6 },
    enableBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: c.info,
      borderRadius: 8,
    },
    enableText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
    dismissText: { color: c.info, fontSize: 11, fontWeight: "600" },
  });

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!Device.isDevice) return;
    (async () => {
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissed === "true") return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") setShow(true);
    })();
  }, []);

  const handleEnable = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") setShow(false);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.emoji}>🔔</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Turn on notifications</Text>
        <Text style={styles.text}>
          Get notified when someone joins your Plan or sends a message.
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleEnable} style={styles.enableBtn}>
          <Text style={styles.enableText}>Enable</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss}>
          <Text style={styles.dismissText}>Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}