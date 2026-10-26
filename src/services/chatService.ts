import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Platform } from "react-native";
import { db, storage } from "../lib/firebase";
import { GarbaCrewUser } from "../types/user";
import { ChatMessage } from "../types/plan";

// ─────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────
// Fixes Android file:// protocol issues for fetch/upload
const ensureValidUri = (uriInput: string): string => {
  if (!uriInput || typeof uriInput !== "string") return uriInput;
  if (
    Platform.OS === "android" &&
    !uriInput.startsWith("file://") &&
    !uriInput.startsWith("content://") &&
    !uriInput.startsWith("http")
  ) {
    return `file://${uriInput}`;
  }
  return uriInput;
};

// ─────────────────────────────────────────────────────────
// Subscribe to messages
// ─────────────────────────────────────────────────────────
export function subscribeToMessages(
  chatId: string,
  onMessages: (msgs: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(500)
  );
  return onSnapshot(q, (snap) => {
    onMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

// ─────────────────────────────────────────────────────────
// Text messages
// ─────────────────────────────────────────────────────────
export async function sendTextMessage(
  chatId: string,
  me: GarbaCrewUser,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "text",
    text: trimmed,
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed,
    lastMessageAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Image messages
// ─────────────────────────────────────────────────────────
export async function sendImageMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string
): Promise<void> {
  // Apply URI fix
  const validUri = ensureValidUri(localUri);
  const response = await fetch(validUri);
  const blob = await response.blob();
  const path = `chats/${chatId}/${me.uid}/${Date.now()}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(ref);

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "image",
    text: "",
    imageUrl: url,
    voiceUrl: null,
    voiceDurationMs: null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: "📷 Photo",
    lastMessageAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Voice messages
// ─────────────────────────────────────────────────────────
export async function sendVoiceMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  durationMs: number
): Promise<void> {
  // Apply URI fix to prevent MalformedURLException
  const validUri = ensureValidUri(localUri);
  const response = await fetch(validUri);
  const blob = await response.blob();
  const path = `chats/${chatId}/${me.uid}/${Date.now()}.m4a`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, { contentType: "audio/m4a" });
  const url = await getDownloadURL(ref);

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "voice",
    text: "",
    imageUrl: null,
    voiceUrl: url,
    voiceDurationMs: durationMs,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: "🎤 Voice message",
    lastMessageAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Location messages (NEW)
// ─────────────────────────────────────────────────────────
export async function sendLocationMessage(
  chatId: string,
  me: GarbaCrewUser,
  latitude: number,
  longitude: number,
  isLive: boolean = false
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "location",
    text: "",
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    latitude,
    longitude,
    isLive,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: isLive ? "📍 Live Location" : "📍 Location",
    lastMessageAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// System messages
// ─────────────────────────────────────────────────────────
export async function sendSystemMessage(
  chatId: string,
  text: string
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: "system",
    fromName: "GarbaCrew",
    fromPhotoUrl: null,
    type: "system",
    text,
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    createdAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Typing indicator
// ─────────────────────────────────────────────────────────
export async function setTyping(
  chatId: string,
  me: GarbaCrewUser,
  isTyping: boolean
): Promise<void> {
  const ref = doc(db, "chats", chatId, "typing", me.uid);
  if (isTyping) {
    await setDoc(ref, {
      uid: me.uid,
      name: me.name ?? "Someone",
      at: serverTimestamp(),
    });
  } else {
    await deleteDoc(ref).catch(() => {});
  }
}

export function subscribeToTyping(
  chatId: string,
  myUid: string,
  onTyping: (names: string[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "chats", chatId, "typing"), (snap) => {
    const now = Date.now();
    const names: string[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid === myUid) return;
      const at = (data.at as Timestamp)?.toMillis?.() ?? 0;
      if (now - at < 6000) names.push(data.name);
    });
    onTyping(names);
  });
}

// ─────────────────────────────────────────────────────────
// Read receipts
// ─────────────────────────────────────────────────────────
export async function markChatRead(
  chatId: string,
  uid: string
): Promise<void> {
  await setDoc(
    doc(db, "chats", chatId, "reads", uid),
    { uid, lastReadAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeToReads(
  chatId: string,
  onReads: (reads: Record<string, number>) => void
): Unsubscribe {
  return onSnapshot(collection(db, "chats", chatId, "reads"), (snap) => {
    const out: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const at = (data.lastReadAt as Timestamp)?.toMillis?.() ?? 0;
      out[data.uid] = at;
    });
    onReads(out);
  });
}