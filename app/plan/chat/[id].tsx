import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';
import { useAuth } from '../../../src/context/AuthContext';
import {
  subscribeToMessages,
  subscribeToTyping,
  markChatRead,
} from '../../../src/services/chatService';
import { ChatMessage } from '../../../src/types/plan';
import ChatComposer from '../../../src/components/chat/ChatComposer';
import MessageBubble from '../../../src/components/chat/MessageBubble';
import { Ionicons } from '@expo/vector-icons';

export default function PlanChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const planId = id ?? '';
  const chatId = `plan_${planId}`;

  const [planTitle, setPlanTitle] = useState('Plan Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    (async () => {
      if (!planId) return;
      const snap = await getDoc(doc(db, 'plans', planId));
      if (snap.exists()) setPlanTitle(snap.data()?.title ?? 'Plan Chat');
    })();
  }, [planId]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !user) return;
    const unsub = subscribeToTyping(chatId, user.uid, setTypingUsers);
    return () => unsub();
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId || !user) return;
    markChatRead(chatId, user.uid).catch(() => {});
  }, [chatId, user, messages.length]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER matching your screenshot */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>{planTitle}</Text>
          <Text style={styles.headerSub}>{messages.length} messages</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.body}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#f43f5e" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble message={item} isOwn={item.fromUid === user.uid} />
              )}
              contentContainerStyle={{ paddingVertical: 8 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {typingUsers.length > 0 && (
            <View style={styles.typingBar}>
              <Text style={styles.typingText}>{typingUsers.join(', ')} is typing…</Text>
            </View>
          )}
        </View>

        <ChatComposer
          chatId={chatId}
          me={user}
          onSent={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  typingBar: { paddingHorizontal: 16, paddingVertical: 4, backgroundColor: '#f3f4f6' },
  typingText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
});