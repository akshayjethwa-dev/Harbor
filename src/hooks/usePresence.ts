// src/hooks/usePresence.ts
import { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { updatePresence, removePresence, subscribeToPresence } from "../services/presenceService";
import { PresenceRecord } from "../types/presence";

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const STALE_TIMEOUT = 30000;      // 30 seconds

export function usePresence(planId: string | undefined) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<PresenceRecord[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // 1. Handle App State Changes (Foreground / Background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
      if (planId && user) {
        if (nextAppState === "active") {
          updatePresence(planId, user, "active");
        } else if (nextAppState === "background" || nextAppState === "inactive") {
          updatePresence(planId, user, "away");
        }
      }
    });

    return () => subscription.remove();
  }, [planId, user]);

  // 2. Heartbeat & Cleanup
  useEffect(() => {
    if (!planId || !user) return;

    // Initial ping
    const initialStatus = appState === "active" ? "active" : "away";
    updatePresence(planId, user, initialStatus);

    // Interval ping
    const interval = setInterval(() => {
      const currentStatus = AppState.currentState === "active" ? "active" : "away";
      updatePresence(planId, user, currentStatus);
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      removePresence(planId, user.uid);
    };
  }, [planId, user]); // Note: we don't re-run on appState change to avoid resetting the interval

  // 3. Subscribe to Viewers & Filter Stale
  useEffect(() => {
    if (!planId) return;

    const unsub = subscribeToPresence(planId, (allViewers) => {
      const now = Date.now();
      
      const activeViewers = allViewers.filter((v) => {
        // Exclude users who haven't pinged in 30s
        const lastPing = v.lastActiveAt?.toMillis?.() || 0;
        if (now - lastPing > STALE_TIMEOUT) return false;
        return true;
      });

      setViewers(activeViewers);
    });

    return () => unsub();
  }, [planId]);

  return { viewers, appState };
}