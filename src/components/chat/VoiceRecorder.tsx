// src/components/chat/VoiceRecorder.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

const MAX_DURATION_MS = 60 * 1000; // 60s

export type VoiceRecorderResult = {
  uri: string;
  durationMs: number;
};

type Props = {
  onSend: (result: VoiceRecorderResult) => void;
  onCancel?: () => void;
};

export default function VoiceRecorder({ onSend, onCancel }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);

  // Player is created lazily once we have a URI
  const player = useAudioPlayer(recordedUri ?? '');
  const playerStatus = useAudioPlayerStatus(player);
  const autoStopTriggered = useRef(false);

  // 1. Ask for mic permission on mount
  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
    })();
  }, []);

  // 2. Auto-stop when max duration is reached
  useEffect(() => {
    if (
      recorderState.isRecording &&
      recorderState.durationMillis >= MAX_DURATION_MS &&
      !autoStopTriggered.current
    ) {
      autoStopTriggered.current = true;
      void stopRecording();
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  const startRecording = useCallback(async () => {
    if (!permissionGranted) return;
    try {
      setIsPreparing(true);
      autoStopTriggered.current = false;
      setRecordedUri(null);
      setRecordedDuration(0);

      // iOS needs allowsRecording=true to record at all
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn('[VoiceRecorder] startRecording failed', e);
    } finally {
      setIsPreparing(false);
    }
  }, [permissionGranted, recorder]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) return;
    try {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      // After stop, allow playback through the speaker
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (recorder.uri) {
        setRecordedUri(recorder.uri);
        setRecordedDuration(durationMs);
      }
    } catch (e) {
      console.warn('[VoiceRecorder] stopRecording failed', e);
    }
  }, [recorder, recorderState.durationMillis, recorderState.isRecording]);

  const reset = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {}
    setRecordedUri(null);
    setRecordedDuration(0);
  }, [player]);

  const handleSend = useCallback(() => {
    if (!recordedUri) return;
    onSend({ uri: recordedUri, durationMs: recordedDuration });
    reset();
  }, [recordedUri, recordedDuration, onSend, reset]);

  const handleCancel = useCallback(() => {
    reset();
    onCancel?.();
  }, [reset, onCancel]);

  const formatMs = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- Render states ---

  if (permissionGranted === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (permissionGranted === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Microphone permission is required.</Text>
      </View>
    );
  }

  // Preview state: recording finished, user can play / send / cancel
  if (recordedUri) {
    const isPlaying = playerStatus.playing;
    const playDuration = playerStatus.duration || recordedDuration / 1000;
    const playPosition = playerStatus.currentTime || 0;

    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              if (playerStatus.currentTime >= playerStatus.duration) {
                player.seekTo(0);
              }
              player.play();
            }
          }}
        >
          <Text style={styles.iconText}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <Text style={styles.text}>
          {formatMs(playPosition * 1000)} / {formatMs(playDuration * 1000)}
        </Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Recording state
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.recordBtn, recorderState.isRecording && styles.recordBtnActive]}
        onPress={recorderState.isRecording ? stopRecording : startRecording}
        disabled={isPreparing}
      >
        {isPreparing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.recordText}>
            {recorderState.isRecording
              ? `Stop  ${formatMs(recorderState.durationMillis)}`
              : 'Record'}
          </Text>
        )}
      </TouchableOpacity>

      {recorderState.isRecording && (
        <Text style={styles.text}>
          {formatMs(MAX_DURATION_MS - recorderState.durationMillis)} left
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: { fontSize: 14, color: '#333', fontVariant: ['tabular-nums'] },
  recordBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 96,
    alignItems: 'center',
  },
  recordBtnActive: { backgroundColor: '#C62828' },
  recordText: { color: '#fff', fontWeight: '600' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: '#666' },
  sendBtn: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});