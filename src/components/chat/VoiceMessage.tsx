import React, { useEffect, useRef, useState } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Audio } from "expo-av";

interface Props {
  url: string;
  durationMs: number;
  mine: boolean;
}

export default function VoiceMessage({ url, durationMs, mine }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    return () => {
      (async () => {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      })();
    };
  }, []);

  const toggle = async () => {
    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setPositionMs(status.positionMillis);
        if (status.didJustFinish) {
          setPlaying(false);
          setPositionMs(0);
        }
      });
      setPlaying(true);
    } else {
      await soundRef.current.playAsync();
      setPlaying(true);
    }
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <TouchableOpacity
      style={[styles.wrap, mine ? styles.mine : styles.theirs]}
      onPress={toggle}
    >
      <Text style={[styles.icon, mine && { color: "#FFF" }]}>
        {playing ? "⏸" : "▶"}
      </Text>
      <View style={styles.barWrap}>
        <View
          style={[
            styles.bar,
            { width: `${progress * 100}%` },
            mine ? { backgroundColor: "#FFF" } : { backgroundColor: "#E91E63" },
          ]}
        />
        <View style={styles.barTrack} />
      </View>
      <Text style={[styles.duration, mine && { color: "#FFF" }]}>
        {Math.round((durationMs - positionMs) / 1000)}s
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 180,
    gap: 10,
  },
  mine: { backgroundColor: "#E91E63" },
  theirs: { backgroundColor: "#F0F0F0" },
  icon: { fontSize: 16, color: "#333" },
  barWrap: { flex: 1, height: 6, position: "relative", justifyContent: "center" },
  barTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
  },
  bar: { height: 3, borderRadius: 2, zIndex: 2 },
  duration: { fontSize: 11, color: "#666", fontWeight: "600", minWidth: 28, textAlign: "right" },
});