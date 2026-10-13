import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    banner: {
      backgroundColor: c.warning + "22",
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: c.warning + "44",
    },
    text: { fontSize: 12, color: c.warning, fontWeight: "600" },
  });

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        📡 You're offline. Some features may be limited.
      </Text>
    </View>
  );
}