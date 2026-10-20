// src/components/plan/CommentsModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator
} from "react-native";
import { PlanComment, CommentItemType } from "../../types/comment";
import { PlanParticipant } from "../../types/plan";
import { subscribeToComments, addComment, editComment, deleteComment, reportComment } from "../../services/commentService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { ThemeColors } from "../../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string;
  itemId: string;
  itemType: CommentItemType;
  itemTitle: string;
  participants: PlanParticipant[];
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: "85%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.text },
  headerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  closeBtn: { fontSize: 20, color: c.textMuted },
  
  list: { flex: 1, padding: 16 },
  emptyText: { textAlign: "center", color: c.textMuted, marginTop: 40 },
  
  // Comment Thread
  threadContainer: { marginBottom: 20 },
  commentRow: { flexDirection: "row", marginBottom: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarInitial: { fontSize: 12, fontWeight: "700", color: c.textMuted },
  bubble: { flex: 1, backgroundColor: c.bgSubtle, padding: 12, borderRadius: 12, borderTopLeftRadius: 4 },
  authorName: { fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 4 },
  commentText: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
  linkText: { color: c.primary, textDecorationLine: "underline" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 6, paddingLeft: 4 },
  actionBtn: { fontSize: 11, fontWeight: "700", color: c.textMuted },
  
  // Reply Thread (Indented)
  replyThread: { marginLeft: 42, marginTop: 8, borderLeftWidth: 2, borderLeftColor: c.border, paddingLeft: 12 },

  // Input Area
  inputWrapper: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.primary + "11", padding: 8, borderRadius: 8, marginBottom: 8 },
  replyBannerText: { fontSize: 12, color: c.primary, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1, backgroundColor: c.bgSubtle, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    fontSize: 15, color: c.text, maxHeight: 100, borderWidth: 1, borderColor: c.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
  mentionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.bgSubtle, alignItems: "center", justifyContent: "center" },
});

// Simple link parser
const renderText = (text: string, styles: any) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <Text key={i} style={styles.linkText}>{part}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
};

export default function CommentsModal({ visible, onClose, planId, itemId, itemType, itemTitle, participants }: Props) {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [comments, setComments] = useState<PlanComment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<PlanComment | null>(null);
  const [editing, setEditing] = useState<PlanComment | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && planId && itemId) {
      const unsub = subscribeToComments(planId, itemId, setComments);
      return () => unsub();
    }
  }, [visible, planId, itemId]);

  // Group into threads
  const topLevel = comments.filter(c => c.parentId === null);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      if (editing) {
        await editComment(planId, editing.id, text);
        setEditing(null);
      } else {
        await addComment(
          planId, itemId, itemType, text,
          { uid: user.uid, name: user.name || "Unknown", photoUrl: user.photoUrl || null },
          replyTo?.id || null
        );
      }
      setText("");
      setReplyTo(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c: PlanComment) => {
    setEditing(c);
    setText(c.text);
    setReplyTo(null);
  };

  const handleDelete = (c: PlanComment) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteComment(planId, c.id) }
    ]);
  };

  const handleReport = (c: PlanComment) => {
    Alert.alert("Report", "Report this comment for moderation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Report", style: "destructive", onPress: () => reportComment(planId, c.id) }
    ]);
  };

  const insertMention = (name: string) => {
    setText(prev => `${prev}@${name.replace(/\s/g, "")} `);
    setShowMentions(false);
  };

  const canEdit = (c: PlanComment) => {
    if (c.authorUid !== user?.uid || c.isDeleted) return false;
    const createdMs = c.createdAt?.toMillis?.() || 0;
    return (Date.now() - createdMs) < 15 * 60 * 1000; // 15 mins
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Comments</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{itemTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {topLevel.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet. Start the conversation!</Text>
            ) : (
              topLevel.map(parent => (
                <View key={parent.id} style={styles.threadContainer}>
                  {/* Parent Comment */}
                  <View style={styles.commentRow}>
                    {parent.authorPhotoUrl ? <Image source={{ uri: parent.authorPhotoUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{parent.authorName.charAt(0)}</Text></View>}
                    <View style={styles.bubble}>
                      <Text style={styles.authorName}>{parent.authorName}</Text>
                      <Text style={[styles.commentText, parent.isDeleted && { fontStyle: "italic", color: styles.emptyText.color }]}>
                        {renderText(parent.text, styles)}
                      </Text>
                      {!parent.isDeleted && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity onPress={() => setReplyTo(parent)}><Text style={styles.actionBtn}>Reply</Text></TouchableOpacity>
                          {canEdit(parent) && <TouchableOpacity onPress={() => handleEdit(parent)}><Text style={styles.actionBtn}>Edit</Text></TouchableOpacity>}
                          {canEdit(parent) && <TouchableOpacity onPress={() => handleDelete(parent)}><Text style={styles.actionBtn}>Delete</Text></TouchableOpacity>}
                          {parent.authorUid !== user?.uid && <TouchableOpacity onPress={() => handleReport(parent)}><Text style={[styles.actionBtn, { color: "#F44336" }]}>Report</Text></TouchableOpacity>}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Replies */}
                  <View style={styles.replyThread}>
                    {getReplies(parent.id).map(reply => (
                      <View key={reply.id} style={styles.commentRow}>
                        {reply.authorPhotoUrl ? <Image source={{ uri: reply.authorPhotoUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{reply.authorName.charAt(0)}</Text></View>}
                        <View style={styles.bubble}>
                          <Text style={styles.authorName}>{reply.authorName}</Text>
                          <Text style={[styles.commentText, reply.isDeleted && { fontStyle: "italic", color: styles.emptyText.color }]}>
                            {renderText(reply.text, styles)}
                          </Text>
                          {!reply.isDeleted && (
                            <View style={styles.actionRow}>
                              {canEdit(reply) && <TouchableOpacity onPress={() => handleEdit(reply)}><Text style={styles.actionBtn}>Edit</Text></TouchableOpacity>}
                              {canEdit(reply) && <TouchableOpacity onPress={() => handleDelete(reply)}><Text style={styles.actionBtn}>Delete</Text></TouchableOpacity>}
                              {reply.authorUid !== user?.uid && <TouchableOpacity onPress={() => handleReport(reply)}><Text style={[styles.actionBtn, { color: "#F44336" }]}>Report</Text></TouchableOpacity>}
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputWrapper}>
            {replyTo && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyBannerText}>Replying to {replyTo.authorName}</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}><Text style={{ color: styles.replyBannerText.color, fontWeight: "800" }}>✕</Text></TouchableOpacity>
              </View>
            )}
            {editing && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyBannerText}>Editing comment</Text>
                <TouchableOpacity onPress={() => { setEditing(null); setText(""); }}><Text style={{ color: styles.replyBannerText.color, fontWeight: "800" }}>✕</Text></TouchableOpacity>
              </View>
            )}

            {showMentions && (
              <ScrollView horizontal style={{ maxHeight: 50, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                {participants.map(p => (
                  <TouchableOpacity key={p.uid} style={{ padding: 8, backgroundColor: styles.bubble.backgroundColor, borderRadius: 8, marginRight: 8 }} onPress={() => insertMention(p.name)}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: styles.commentText.color }}>@{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.mentionBtn} onPress={() => setShowMentions(!showMentions)}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: styles.closeBtn.color }}>@</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor={styles.closeBtn.color}
                value={text}
                onChangeText={setText}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={submitting || !text.trim()}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontSize: 18 }}>↑</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}