import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useInvitationsCount } from "../../src/hooks/useInvitationsCount";
import { useUnreadCounts } from "../../src/hooks/useUnreadCounts";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";

function InvitationsBell() {
  const router = useRouter();
  const count = useInvitationsCount();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.bell}
      onPress={() => router.push("/invitations" as any)}
      activeOpacity={0.7}
    >
      <Ionicons name="mail-outline" size={22} color={colors.text} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const counts = useUnreadCounts();
  const { colors, isDark } = useTheme();
  const showPartners = user?.lookingForPartner === true;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <InvitationsBell />,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: "800", color: colors.text },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 64 : 60,
          paddingBottom: Platform.OS === "web" ? 10 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="crews"
        options={{
          title: "Discover",
          tabBarBadge: counts.plans > 0 ? counts.plans : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="squads"
        options={{
          title: "Squads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="partners"
        options={{
          title: "Partners",
          href: showPartners ? ("/partners" as any) : null,
          tabBarBadge: counts.partners > 0 ? counts.partners : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trust"
        options={{
          title: "Trust",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bell: { marginRight: 16, padding: 4, position: "relative" },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
});