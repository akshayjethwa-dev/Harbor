import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import VoiceMessage from './VoiceMessage';
import { ChatMessage } from '../../types/chat'; // <-- FIXED IMPORT PATH

// Inlined props to prevent IntrinsicAttributes TS errors
export default function MessageBubble({ 
  message, 
  isOwn, 
  onImagePress 
}: { 
  message: ChatMessage; 
  isOwn: boolean; 
  onImagePress?: (url: string) => void;
}) {
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

  const isMedia = message.type === 'image' || message.type === 'video';

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[
        styles.bubble, 
        isOwn ? styles.bubbleOwn : styles.bubbleOther,
        isMedia ? styles.mediaBubble : styles.textBubble
      ]}>
        {!isOwn && !isMedia && <Text style={styles.sender}>{message.fromName}</Text>}

        {message.type === 'text' && (
          <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        )}

        {message.type === 'image' && (
          <TouchableOpacity 
            style={styles.mediaContainer}
            activeOpacity={0.9}
            onPress={() => onImagePress?.(message.mediaUrl ?? message.imageUrl ?? '')}
          >
            <Image 
              source={{ uri: message.mediaUrl ?? message.imageUrl ?? '' }} 
              style={styles.image} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {message.type === 'video' && (
          <View style={styles.mediaContainer}>
             <Video 
               source={{ uri: message.mediaUrl ?? '' }} 
               style={styles.video} 
               useNativeControls 
               resizeMode={ResizeMode.COVER} 
             />
          </View>
        )}

        {(message.type === 'voice' || message.type === 'audio') && (
          <View style={isOwn ? styles.voiceWrapperOwn : styles.voiceWrapperOther}>
             <VoiceMessage
               uri={message.mediaUrl ?? message.voiceUrl ?? ''}
               durationMs={message.mediaDurationMs ?? message.voiceDurationMs ?? 0}
             />
          </View>
        )}

        {message.type === 'document' && (
          <TouchableOpacity onPress={() => Linking.openURL(message.mediaUrl ?? '')} style={styles.docRow}>
            <View style={[styles.docIconBg, isOwn ? { backgroundColor: '#fff' } : { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text" size={24} color={isOwn ? '#f43f5e' : '#2563eb'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text numberOfLines={1} style={[styles.docName, isOwn && styles.textOwn]}>
                {message.mediaName ?? 'Document.pdf'}
              </Text>
              <Text style={[styles.docMeta, isOwn && { color: '#fecdd3' }]}>
                {message.mediaSize ? `${(message.mediaSize / 1024).toFixed(0)} KB` : 'Click to open'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {message.type === 'location' && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.google.com/maps?q=${message.latitude},${message.longitude}`)}
            style={styles.locRow}
          >
            <View style={[styles.locIconBg, isOwn ? { backgroundColor: '#fff' } : { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="location" size={24} color={isOwn ? '#f43f5e' : '#10b981'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.locTitle, isOwn && styles.textOwn]}>Live Location</Text>
              <Text numberOfLines={2} style={[styles.locAddress, isOwn && { color: '#fecdd3' }]}>
                {message.address ?? 'View on Google Maps'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {isMedia ? (
          <View style={styles.timeOverlay}>
            <Text style={styles.timeOverlayText}>{time}</Text>
          </View>
        ) : (
          <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, overflow: 'hidden' },
  textBubble: { padding: 10, paddingBottom: 6 },
  mediaBubble: { padding: 2, backgroundColor: 'transparent' }, 
  bubbleOwn: { backgroundColor: '#f43f5e', borderBottomRightRadius: 4 }, 
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  
  sender: { fontSize: 12, fontWeight: '700', color: '#f43f5e', marginBottom: 4 },
  text: { fontSize: 15, color: '#111827', lineHeight: 22 },
  textOwn: { color: '#fff' },
  
  mediaContainer: { position: 'relative' },
  image: { width: 260, height: 260, borderRadius: 14 },
  video: { width: 260, height: 260, borderRadius: 14, backgroundColor: '#000' },
  
  voiceWrapperOwn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 2 },
  voiceWrapperOther: { backgroundColor: '#f3f4f6', borderRadius: 20, padding: 2 },

  docRow: { flexDirection: 'row', alignItems: 'center', minWidth: 220, marginVertical: 4 },
  docIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  docMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  
  locRow: { flexDirection: 'row', alignItems: 'center', minWidth: 220, marginVertical: 4 },
  locIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  locTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  locAddress: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 16 },
  
  time: { fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 4 },
  timeOwn: { color: '#fecdd3' },
  timeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeOverlayText: { fontSize: 10, color: '#ffffff', fontWeight: '500' },

  systemWrapper: { alignItems: 'center', marginVertical: 10 },
  systemBubble: { backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  systemText: { fontSize: 12, color: '#4b5563', fontStyle: 'italic' },
});