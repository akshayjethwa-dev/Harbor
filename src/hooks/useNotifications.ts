import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  setupNotificationChannels,
  registerForPushNotifications,
  attachNotificationTapHandler,
} from "../services/notificationService";

const isWeb = Platform.OS === "web";

export function useNotifications() {
  const { user } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );

  // Register token when user signs in (native only)
  useEffect(() => {
    if (isWeb) return;
    if (!user) return;

    (async () => {
      try {
        await setupNotificationChannels();
        const token = await registerForPushNotifications(user.uid);
        setPermissionGranted(!!token);
      } catch (error) {
        console.warn("[useNotifications] Registration failed:", error);
        setPermissionGranted(false);
      }
    })();
  }, [user]);

  // Attach notification-tap routing (native only)
  // We use a runtime check inside notificationService to prevent the
  // "Listening to push token changes is not yet fully supported on web" warning.
  useEffect(() => {
    if (isWeb) return;
    const cleanup = attachNotificationTapHandler();
    return cleanup;
  }, []);

  return {
    permissionGranted,
    requestPermission: async () => {
      if (isWeb) return false;
      if (!user) return false;
      try {
        const token = await registerForPushNotifications(user.uid);
        setPermissionGranted(!!token);
        return !!token;
      } catch {
        return false;
      }
    },
  };
}