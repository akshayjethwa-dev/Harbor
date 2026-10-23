// src/components/chat/VoiceMessage.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons'; // Ensure you have @expo/vector-icons installed

type Props = {
  uri: string;
  durationMs?: number; // Optional: passed from the message object
};

export default function VoiceMessage({ uri, durationMs }: Props) {
  // Initialize the player with the audio URI
  const player = useAudioPlayer(uri);
  
  // Get the status (playing, currentTime, duration) - this fixes the 'status' any type error
  const status = useAudioPlayerStatus(player);

  const togglePlayback = () => {
    if (status.playing) {
      player.pause();
    } else {
      // If it finished playing, reset to 0 before playing again
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use the duration from the player if available, otherwise fallback to the prop
  const totalDuration = status.duration || (durationMs ? durationMs / 1000 : 0);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
        <Ionicons 
          name={status.playing ? 'pause' : 'play'} 
          size={20} 
          color="#007AFF" 
        />
      </TouchableOpacity>
      
      <Text style={styles.timeText}>
        {formatTime(status.currentTime)} / {formatTime(totalDuration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 10,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    fontVariant: ['tabular-nums'],
  },
});