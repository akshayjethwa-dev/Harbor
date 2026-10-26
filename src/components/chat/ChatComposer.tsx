import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import VoiceRecorder from './VoiceRecorder';
import {
  sendTextMessage,
  sendFileMessage,
  sendLocationMessage,
  setTyping,
} from '../../services/chatService';
import { GarbaCrewUser } from '../../types/user';

interface ChatComposerProps {
  chatId: string;
  me: GarbaCrewUser;
  onSent?: () => void;
}

export default function ChatComposer({ chatId, me, onSent }: ChatComposerProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  const handleTextChange = (t: string) => {
    setText(t);
    setTyping(chatId, me, t.length > 0).catch(() => {});
  };

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    setTyping(chatId, me, false).catch(() => {});
    try {
      await sendTextMessage(chatId, me, trimmed);
      onSent?.();
    } catch (e: any) {
      Alert.alert('Send failed', e?.message);
    }
  };

  const pickImageOrVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access.');
    
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      const isVideo = asset.type === 'video';
      await sendFileMessage(chatId, me, asset.uri, asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'));
      onSent?.();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message);
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      await sendFileMessage(chatId, me, res.assets[0].uri, res.assets[0].name);
      onSent?.();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message);
    } finally {
      setUploading(false);
    }
  };

  const shareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access.');
    setUploading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let address: string | undefined;
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (geo[0]) {
          address = [geo[0].name, geo[0].street, geo[0].city].filter(Boolean).join(', ');
        }
      } catch {}
      await sendLocationMessage(chatId, me, pos.coords.latitude, pos.coords.longitude, false, address);
      onSent?.();
    } catch (e: any) {
      Alert.alert('Location failed', e?.message);
    } finally {
      setUploading(false);
    }
  };

  const openAttach = () => {
    Alert.alert('Share', 'What would you like to send?', [
      { text: 'Photo / Video', onPress: pickImageOrVideo },
      { text: 'Document', onPress: pickDocument },
      { text: 'Location', onPress: shareLocation },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (showRecorder) {
    return (
      <VoiceRecorder
        chatId={chatId}
        me={me}
        onSent={() => { setShowRecorder(false); onSent?.(); }}
        onCancel={() => setShowRecorder(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {uploading && (
        <View style={styles.uploadBar}>
          <ActivityIndicator size="small" color="#f43f5e" />
          <Text style={{ color: '#f43f5e', marginLeft: 8, fontSize: 12 }}>Uploading...</Text>
        </View>
      )}
      <View style={styles.row}>
        {/* Mic Button */}
        <TouchableOpacity onPress={() => setShowRecorder(true)} disabled={uploading} style={styles.iconBtn}>
          <Ionicons name="mic-outline" size={26} color="#4b5563" />
        </TouchableOpacity>

        {/* Camera Button (Opens Attach Menu) */}
        <TouchableOpacity onPress={openAttach} disabled={uploading} style={styles.iconBtn}>
          <Ionicons name="camera-outline" size={26} color="#4b5563" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Message"
          placeholderTextColor="#9ca3af"
          multiline
        />

        {/* Pink Send Button */}
        <TouchableOpacity onPress={handleSendText} disabled={!text.trim() || uploading} style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  iconBtn: { padding: 6 },
  input: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    maxHeight: 100, 
    marginHorizontal: 8,
    fontSize: 15,
  },
  sendBtn: { 
    backgroundColor: '#f43f5e', // Pink theme from your screenshot
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadBar: { 
    flexDirection: 'row',
    padding: 6, 
    backgroundColor: '#fff1f2', 
    alignItems: 'center',
    justifyContent: 'center'
  },
});