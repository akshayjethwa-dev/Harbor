// src/services/notificationService.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { router } from "expo-router";

// Guard: expo-notifications' native APIs are unavailable on web.
const isWeb = Platform.OS === "web";

// Global handler — only installed on native.
// Calling setNotificationHandler on web throws, so we skip it entirely.
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─────────────────────────────────────────────────────────
// Notification kinds (used by Cloud Functions + routing below)
// ─────────────────────────────────────────────────────────
export type NotificationKind =
  // ── Existing ──
  | "plan_join_request"
  | "plan_join_approved"
  | "plan_join_declined"
  | "plan_created"
  | "plan_cancelled"
  | "plan_reminder"
  | "chat_message"
  | "squad_invite"
  | "squad_archived"
  | "invitation"
  | "sos"
  | "report_resolved"
  | "rating_prompt"
  // ── Task 2: Date Polls ──
  | "poll_created"
  | "poll_closed"
  | "poll_expired_no_votes"
  | "poll_needs_new";

// ─────────────────────────────────────────────────────────
// Android notification channels
// ─────────────────────────────────────────────────────────
export async function setupNotificationChannels(): Promise<void> {
  if (isWeb) return;
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#E91E63",
  });
  await Notifications.setNotificationChannelAsync("sos", {
    name: "Emergency SOS",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: "#FF0000",
    bypassDnd: true,
  });
  await Notifications.setNotificationChannelAsync("chat", {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100],
  });
  // ── Task 2: Polls ──
  await Notifications.setNotificationChannelAsync("polls", {
    name: "Date polls",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 100, 150],
    lightColor: "#E91E63",
  });
}

// ─────────────────────────────────────────────────────────
// Permission + token registration
// ─────────────────────────────────────────────────────────
export async function registerForPushNotifications(
  uid: string
): Promise<string | null> {
  // Web doesn't support Expo push tokens in this SDK version.
  if (isWeb) return null;

  // Emulators can't receive FCM
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  // Request permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  // Get the Expo push token
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn("No EAS projectId — cannot get push token");
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data;

    await setDoc(
      doc(db, "deviceTokens", uid),
      {
        uid,
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName ?? "Unknown",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return token;
  } catch (error) {
    console.error("Could not register push token:", error);
    return null;
  }
}

export async function unregisterPushNotifications(
  uid: string
): Promise<void> {
  if (isWeb) return;
  try {
    await deleteDoc(doc(db, "deviceTokens", uid));
  } catch {
    // Ignore
  }
}

// ─────────────────────────────────────────────────────────
// Notification tap → route
// ─────────────────────────────────────────────────────────
/**
 * Called once at app boot — wires the notification-tap listener
 * to the router. On web, returns a no-op cleanup function.
 */
export function attachNotificationTapHandler(): () => void {
  if (isWeb) {
    return () => {};
  }

  let subscription: { remove: () => void } | null = null;

  try {
    subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        routeFromNotification(data);
      }
    );

    // Handle the case where the app was launched from a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response.notification.request.content.data as any;
          routeFromNotification(data);
        }
      })
      .catch((error) => {
        console.warn(
          "[Notifications] getLastNotificationResponseAsync failed:",
          error?.message ?? error
        );
      });
  } catch (error) {
    console.warn("[Notifications] Could not attach tap handler:", error);
  }

  return () => {
    try {
      subscription?.remove();
    } catch {
      // Ignore
    }
  };
}

/**
 * Maps notification `data` to an Expo Router route.
 *
 * Cloud Functions set the `type` field on the notification's `data`
 * payload; this switch routes the user to the right screen.
 */
function routeFromNotification(data: any): void {
  if (!data) return;

  const { type, planId, squadId, chatId } = data;

  try {
    switch (type) {
      case "plan_join_request":
      case "plan_join_approved":
      case "plan_join_declined":
      case "plan_created":
      case "plan_cancelled":
      case "plan_reminder":
      // ── Task 2: Date Polls — all route to the plan detail ──
      case "poll_created":
      case "poll_closed":
      case "poll_expired_no_votes":
      case "poll_needs_new":
        if (planId) router.push(`/plan/${planId}` as any);
        break;

      case "chat_message":
        if (chatId) {
          if (chatId.startsWith("plan_")) {
            router.push(`/plan/chat/${chatId.replace("plan_", "")}` as any);
          } else if (chatId.startsWith("squad_")) {
            router.push(`/squad/${chatId.replace("squad_", "")}` as any);
          }
        }
        break;

      case "squad_invite":
      case "squad_archived":
        if (squadId) router.push(`/squad/${squadId}` as any);
        break;

      case "invitation":
        router.push("/invitations" as any);
        break;

      case "sos":
        if (planId) router.push(`/plan/${planId}` as any);
        break;

      case "report_resolved":
        router.push("/settings/safety" as any);
        break;

      case "rating_prompt":
        if (planId) router.push(`/plan/${planId}` as any);
        break;

      default:
        break;
    }
  } catch (error) {
    console.warn("Could not route from notification:", error);
  }
}