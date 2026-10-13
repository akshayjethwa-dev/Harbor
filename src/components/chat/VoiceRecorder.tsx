import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Audio } from "expo-av";

const MAX_DURATION_MS = 60 * 1000; // 60s

interface Props {
  onSend: (uri: string, durationMs: number) => Promise<void>;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const perm = await Audio.requestPermissionsAsync();
      setPermissionGranted(perm.status === "granted");
      if (perm.status !== "granted") {
        Alert.alert(
          "Microphone access required",
          "Enable microphone access in settings to record voice messages."
        );
        onCancel();
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    if (!permissionGranted) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(true);
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        setElapsedMs((ms) => {
          const next = ms + 100;
          if (next >= MAX_DURATION_MS) {
            stopAndSend();
            return MAX_DURATION_MS;
          }
          return next;
        });
      }, 100);
    } catch (e: any) {
      Alert.alert("Could not start recording", e.message);
      onCancel();
    }
  };

  const stopAndSend = async () => {
    if (!recordingRef.current) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecording(false);
      if (uri) {
        await onSend(uri, elapsedMs);
      }
    } catch (e: any) {
      Alert.alert("Send failed", e.message);
    }
  };

  const cancel = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      recordingRef.current = null;
    }
    setRecording(false);
    onCancel();
  };

  // Auto-start on mount
  useEffect(() => {
    if (permissionGranted && !recording) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted]);

  const secs = Math.floor(elapsedMs / 1000);
  const pct = Math.min(1, elapsedMs / MAX_DURATION_MS);

  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={cancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.trackWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.timer}>
          {recording ? `● Recording ${secs}s / 60s` : "Preparing…"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={stopAndSend}
        style={styles.sendBtn}
        disabled={!recording}
      >
        <Text style={styles.sendIcon}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF5F8",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 12,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "700", color: "#666" },
  trackWrap: { flex: 1 },
  progressTrack: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: "100%", backgroundColor: "#E91E63" },
  timer: { fontSize: 11, color: "#666", fontWeight: "600" },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: { color: "#FFF", fontSize: 16, marginLeft: 3 },
});