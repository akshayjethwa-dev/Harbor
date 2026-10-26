import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import VoiceMessage from './VoiceMessage';
import { ChatMessage } from '../../types/plan';

export default function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const time = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  if (message.type === 'system') {
    return (
      <View style={styles.systemWrapper}>
        <View style={styles.systemBubble}>
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && <Text style={styles.sender}>{message.fromName}</Text>}

        {message.type === 'text' && (
          <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        )}

        {message.type === 'image' && (
          <Image 
            source={{ uri: message.mediaUrl ?? message.imageUrl ?? '' }} 
            style={styles.image} 
            resizeMode="cover"
          />
        )}

        {message.type === 'video' && (
          <Video source={{ uri: message.mediaUrl ?? '' }} style={styles.video} useNativeControls resizeMode={ResizeMode.CONTAIN} />
        )}

        {(message.type === 'voice' || message.type === 'audio') && (
          <VoiceMessage
            uri={message.mediaUrl ?? message.voiceUrl ?? ''}
            durationMs={message.mediaDurationMs ?? message.voiceDurationMs ?? 0}
          />
        )}

        {message.type === 'document' && (
          <TouchableOpacity onPress={() => Linking.openURL(message.mediaUrl ?? '')} style={styles.docRow}>
            <Ionicons name="document-text-outline" size={28} color={isOwn ? '#fff' : '#2563eb'} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text numberOfLines={1} style={[styles.docName, isOwn && styles.textOwn]}>{message.mediaName ?? 'Document'}</Text>
              <Text style={[styles.docMeta, isOwn && { color: '#fecdd3' }]}>
                {message.mediaSize ? `${(message.mediaSize / 1024).toFixed(0)} KB` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {message.type === 'location' && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${message.latitude},${message.longitude}`)}
            style={styles.locRow}
          >
            <Ionicons name="location" size={28} color={isOwn ? '#fff' : '#ef4444'} />
            <Text style={[styles.locText, isOwn && styles.textOwn]}>{message.address ?? 'Shared location'}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, paddingBottom: 6 },
  bubbleOwn: { backgroundColor: '#f43f5e', borderBottomRightRadius: 4 }, // Pink matching your theme
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  
  sender: { fontSize: 11, fontWeight: '700', color: '#f43f5e', marginBottom: 4 },
  text: { fontSize: 15, color: '#111827', lineHeight: 20 },
  textOwn: { color: '#fff' },
  
  image: { width: 220, height: 220, borderRadius: 10, marginBottom: 4 },
  video: { width: 240, height: 160, borderRadius: 10, backgroundColor: '#000', marginBottom: 4 },
  
  docRow: { flexDirection: 'row', alignItems: 'center', minWidth: 200, marginVertical: 4 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  docMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  
  locRow: { flexDirection: 'row', alignItems: 'center', minWidth: 200, marginVertical: 4 },
  locText: { fontSize: 14, marginLeft: 8, color: '#111827', flex: 1 },
  
  time: { fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 4 },
  timeOwn: { color: '#fecdd3' },

  systemWrapper: { alignItems: 'center', marginVertical: 10 },
  systemBubble: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  systemText: { fontSize: 12, color: '#4b5563', fontStyle: 'italic' },
});