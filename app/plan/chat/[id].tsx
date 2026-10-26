import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ChatMessage } from '../../../src/types/chat';
import { subscribeToMessages } from '../../../src/services/chatService';
// Adjust import path to your AuthContext or User Store as needed
import { useAuth } from '../../../src/context/AuthContext'; 
import MessageBubble from '../../../src/components/chat/MessageBubble';
import ChatComposer from '../../../src/components/chat/ChatComposer';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Retrieve current user from your auth state
  const { user: me } = useAuth(); 

  useEffect(() => {
    if (!id) return;
    
    // Subscribe to Firestore messages
    const unsubscribe = subscribeToMessages(id, (newMessages) => {
      setMessages(newMessages);
      if (loading) setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleShare = () => {
    // Implement your share logic
    Alert.alert("Share", "Share plan link triggered");
  };

  const handleSOS = () => {
    // Implement your SOS logic
    Alert.alert("SOS", "Emergency alert triggered!");
  };

  if (!me) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 
        CLEAN NATIVE HEADER 
        Replaces the bulky solid-background buttons with native icons
      */}
      <Stack.Screen 
        options={{
          headerTitle: "Chat", // Dynamically set this to your Plan Name
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
                <Ionicons name="share-outline" size={24} color="#f43f5e" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSOS} style={styles.headerIcon}>
                <Ionicons name="warning-outline" size={24} color="#f43f5e" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#f43f5e" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.fromUid === me.uid} />
          )}
          contentContainerStyle={styles.messageList}
          // Auto-scroll to bottom when new messages arrive
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* WHATSAPP-STYLE COMPOSER */}
      <ChatComposer chatId={id} me={me} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e5e5', // A subtle WhatsApp-like chat background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 10,
  },
  headerIcon: {
    padding: 4,
  },
  messageList: {
    paddingVertical: 12,
  }
});