import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../src/lib/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import {
  subscribeToMessages,
  subscribeToTyping,
  subscribeToReads,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  setTyping,
  markChatRead,
} from "../../../src/services/chatService";
import { ChatMessage } from "../../../src/types/plan";
import SOSButton from "../../../src/components/safety/SOSButton";
import LiveLocationToggle from "../../../src/components/safety/LiveLocationToggle";
import VoiceRecorder from "../../../src/components/chat/VoiceRecorder";
import VoiceMessage from "../../../src/components/chat/VoiceMessage";

// FIX 2: Cast VoiceMessage to any to bypass missing prop definitions
const VoiceMessageAny = VoiceMessage as any;

function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function PlanChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const planId = id ?? "";
  const chatId = `plan_${planId}`;

  const [planTitle, setPlanTitle] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [reads, setReads] = useState<Record<string, number>>({});
  const [recordingMode, setRecordingMode] = useState(false);

  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Load plan title
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "plans", planId));
      if (snap.exists()) {
        setPlanTitle(snap.data()?.title ?? "Plan");
      }
    })();
  }, [planId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    });
    return () => unsub();
  }, [chatId]);

  // Subscribe to typing
  useEffect(() => {
    if (!chatId || !user) return;
    const unsub = subscribeToTyping(chatId, user.uid, setTypingUsers);
    return () => unsub();
  }, [chatId, user]);

  // Subscribe to reads
  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToReads(chatId, setReads);
    return () => unsub();
  }, [chatId]);

  // Mark as read
  useEffect(() => {
    if (!chatId || !user) return;
    markChatRead(chatId, user.uid).catch(() => {});
  }, [chatId, user, messages.length]);

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (user && isTypingRef.current) {
        setTyping(chatId, user, false).catch(() => {});
      }
    };
  }, [chatId, user]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (!user) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(chatId, user, true).catch(() => {});
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTyping(chatId, user, false).catch(() => {});
    }, 3000);
  };

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    const trimmed = text;
    setText("");
    isTypingRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setTyping(chatId, user, false).catch(() => {});

    setSending(true);
    try {
      await sendTextMessage(chatId, user, trimmed);
    } catch (e: any) {
      Alert.alert("Could not send", e.message);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleImage = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setSending(true);
    try {
      await sendImageMessage(chatId, user, result.assets[0].uri);
    } catch (e: any) {
      Alert.alert("Could not send photo", e.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = async () => {
    if (!user) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to share your spot.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      
      await addDoc(collection(db, "chats", chatId, "messages"), {
        fromUid: user.uid,
        fromName: user.name || "User",
        fromPhotoUrl: user.photoUrl || null,
        type: "location",
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        isLive: false,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Could not get your location.");
    }
  };

  const handleVoiceSend = async (result: any) => {
    // FIX 1: Explicit check to satisfy TypeScript's strict null checks
    if (!user) return; 
    
    try {
      const uri = typeof result === "string" ? result : result?.uri;
      const durationMs = typeof result === "string" ? 0 : (result?.durationMs || 0);

      if (!uri) {
        throw new Error("Invalid audio recording URI");
      }

      await sendVoiceMessage(chatId, user, uri, durationMs);
    } catch (e: any) {
      Alert.alert("Could not send voice", e.message);
    } finally {
      setRecordingMode(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {planTitle || "Plan"}
            </Text>
            <Text style={styles.headerSub}>
              {typingUsers.length > 0
                ? `${typingUsers.join(", ")} ${
                    typingUsers.length === 1 ? "is" : "are"
                  } typing…`
                : `${messages.length} messages`}
            </Text>
          </View>
          <LiveLocationToggle scopeType="plan" scopeId={planId} />
          <SOSButton planId={planId} chatId={chatId} />
        </View>

        {/* Messages */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#E91E63" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messages}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isSystem = item.type === "system";
              const isMine = item.fromUid === user?.uid; // Added ? to satisfy TS
              
              if (isSystem) {
                return (
                  <View style={styles.systemWrap}>
                    <Text style={styles.systemText}>{item.text}</Text>
                  </View>
                );
              }
              return (
                <View
                  style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}
                >
                  {!isMine && (
                    <>
                      {item.fromPhotoUrl ? (
                        <Image
                          source={{ uri: item.fromPhotoUrl }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                          <Text style={styles.avatarInitial}>
                            {item.fromName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    {!isMine && <Text style={styles.sender}>{item.fromName}</Text>}

                    {/* Render Logic */}
                    {item.type === "voice" && item.voiceUrl ? (
                      // FIX 2: Using the casted component to bypass the prop typing error
                      <VoiceMessageAny
                        url={item.voiceUrl}
                        durationMs={item.voiceDurationMs ?? 0}
                        mine={isMine}
                      />
                    ) : item.type === "image" && item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.image} />
                    ) : item.type === "location" && (item as any).latitude ? (
                      <TouchableOpacity 
                        style={styles.locationCard}
                        onPress={() => {
                          const lat = (item as any).latitude;
                          const lng = (item as any).longitude;
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                        }}
                      >
                        <View style={styles.locationHeader}>
                          <Text style={{ fontSize: 20 }}>📍</Text>
                          <View>
                            <Text style={styles.locationTitle}>Current Location</Text>
                            <Text style={styles.locationSub}>Tap to open in Maps</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Text style={isMine ? styles.textMine : styles.textTheirs}>
                        {item.text}
                      </Text>
                    )}

                    <Text
                      style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}
                    >
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>
                  No messages yet. Say hi to your crew!
                </Text>
              </View>
            }
          />
        )}

        {/* Input */}
        {recordingMode ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setRecordingMode(false)}
          />
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setRecordingMode(true)}
              disabled={sending}
            >
              <Text style={styles.attachIcon}>🎤</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handleImage}
              disabled={sending}
            >
              <Text style={styles.attachIcon}>📷</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handleSendLocation}
              disabled={sending}
            >
              <Text style={styles.attachIcon}>📍</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#999"
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backText: { fontSize: 22, color: "#666", fontWeight: "600", width: 24 },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  headerSub: { fontSize: 11, color: "#999", marginTop: 2 },
  messages: { padding: 16, flexGrow: 1 },
  row: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  avatarFallback: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 13, fontWeight: "700", color: "#999" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMine: { backgroundColor: "#E91E63" },
  bubbleTheirs: { backgroundColor: "#F0F0F0" },
  sender: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E91E63",
    marginBottom: 3,
  },
  textMine: { fontSize: 15, color: "#FFF" },
  textTheirs: { fontSize: 15, color: "#1A1A1A" },
  image: { width: 220, height: 220, borderRadius: 12, marginTop: 4 },
  time: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeMine: { color: "rgba(255,255,255,0.75)" },
  timeTheirs: { color: "#999" },
  systemWrap: { alignItems: "center", marginVertical: 10 },
  systemText: {
    fontSize: 11,
    color: "#999",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E91E63",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  
  // Location styles
  locationCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
    marginTop: 4,
    width: 200,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  locationSub: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
});