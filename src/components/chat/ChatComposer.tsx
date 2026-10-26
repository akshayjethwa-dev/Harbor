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
  Modal,
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);

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

  const pickImageOrVideo = async (camera: boolean = false) => {
    setShowAttachMenu(false);
    
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow camera access.');
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access.');
    }
    
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    };

    const res = camera 
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    
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
    setShowAttachMenu(false);
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
    setShowAttachMenu(false);
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
        {/* Attachment Trigger */}
        <TouchableOpacity onPress={() => setShowAttachMenu(true)} disabled={uploading} style={styles.attachBtn}>
          <Ionicons name="add" size={28} color="#6b7280" />
        </TouchableOpacity>

        {/* Input Field with Inline Camera */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Message"
            placeholderTextColor="#9ca3af"
            multiline
          />
          {!text.trim() && (
            <TouchableOpacity onPress={() => pickImageOrVideo(true)} style={styles.inlineIconBtn}>
              <Ionicons name="camera-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Button (Mic or Send) */}
        {text.trim() ? (
          <TouchableOpacity onPress={handleSendText} disabled={uploading} style={styles.actionBtn}>
            <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setShowRecorder(true)} disabled={uploading} style={styles.actionBtn}>
            <Ionicons name="mic" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showAttachMenu} transparent animationType="slide" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetIndicator} />
            <View style={styles.attachmentGrid}>
              
              <TouchableOpacity style={styles.gridItem} onPress={() => pickImageOrVideo(false)}>
                <View style={[styles.iconCircle, { backgroundColor: '#8b5cf6' }]}>
                  <Ionicons name="images" size={26} color="#fff" />
                </View>
                <Text style={styles.gridLabel}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={() => pickImageOrVideo(true)}>
                <View style={[styles.iconCircle, { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="camera" size={26} color="#fff" />
                </View>
                <Text style={styles.gridLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={pickDocument}>
                <View style={[styles.iconCircle, { backgroundColor: '#3b82f6' }]}>
                  <Ionicons name="document-text" size={26} color="#fff" />
                </View>
                <Text style={styles.gridLabel}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.gridItem} onPress={shareLocation}>
                <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
                  <Ionicons name="location" size={26} color="#fff" />
                </View>
                <Text style={styles.gridLabel}>Location</Text>
              </TouchableOpacity>

            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 8, 
    paddingVertical: 10, 
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  attachBtn: {
    padding: 6,
    marginBottom: 2,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingLeft: 16,
    paddingRight: 6,
    marginHorizontal: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  input: { 
    flex: 1, 
    fontSize: 16,
    color: '#111827',
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
  },
  inlineIconBtn: {
    padding: 8,
    marginBottom: 2,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f43f5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  uploadBar: { 
    flexDirection: 'row',
    padding: 8, 
    backgroundColor: '#fff1f2', 
    alignItems: 'center',
    justifyContent: 'center'
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  gridItem: {
    alignItems: 'center',
    marginBottom: 20,
    width: '25%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
});