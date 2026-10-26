// src/components/chat/VoiceRecorder.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { sendVoiceMessage } from '../../services/chatService';
import { GarbaCrewUser } from '../../types/user';

interface Props {
  chatId: string;
  me: GarbaCrewUser;
  onSent: () => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ chatId, me, onSent, onCancel }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    start();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const start = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return Alert.alert('Microphone permission needed');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      Alert.alert('Could not start recording', e?.message);
    }
  };

  const stopAndSend = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const durationMs = seconds * 1000;
      if (uri && durationMs > 800) {
        await sendVoiceMessage(chatId, me, uri, durationMs);
        onSent();
      } else {
        onCancel();
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message);
      onCancel();
    }
  };

  const cancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    onCancel();
  };

  return (
    <View style={styles.bar}>
      <View style={styles.dot} />
      <Text style={styles.text}>Recording… {seconds}s</Text>
      <TouchableOpacity onPress={cancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={stopAndSend} style={styles.sendBtn}>
        <Ionicons name="send" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fef2f2' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 8 },
  text: { flex: 1, color: '#991b1b' },
  cancelBtn: { paddingHorizontal: 10 },
  cancelText: { color: '#6b7280' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});