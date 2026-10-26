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
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Platform } from "react-native";
import { db, storage } from "../lib/firebase";
import { GarbaCrewUser } from "../types/user";
import { ChatMessage } from "../types/plan";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB per upload
const STORAGE_ROOT = "chats";             // storage/chats/{chatId}/{uid}/...

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

// Extract file extension from a URI or filename.
const getExtension = (uri: string, fallback = "bin"): string => {
  if (!uri) return fallback;
  const cleaned = uri.split("?")[0].split("#")[0];
  const match = cleaned.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : fallback;
};

const MIME_BY_EXT: Record<string, string> = {
  // images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  // video
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
  // audio
  m4a: "audio/m4a",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  // documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
};

const guessMime = (ext: string): string =>
  MIME_BY_EXT[ext] ?? "application/octet-stream";

const shortPreview = (text: string, max = 60): string =>
  text.length > max ? text.slice(0, max) + "…" : text;

// ─────────────────────────────────────────────────────────
// UPLOAD HELPER
// ─────────────────────────────────────────────────────────
interface UploadResult {
  url: string;
  size: number;
  mime: string;
  ext: string;
}

async function uploadMedia(
  chatId: string,
  uid: string,
  localUri: string,
  options?: {
    extension?: string;
    mimeType?: string;
    fileNameHint?: string;
  }
): Promise<UploadResult> {
  const validUri = ensureValidUri(localUri);

  // Prefer explicit hint, then original filename, then extension from URI.
  const hintExt = options?.fileNameHint
    ? getExtension(options.fileNameHint)
    : undefined;
  const ext =
    options?.extension ??
    hintExt ??
    getExtension(validUri, "bin");
  const mime = options?.mimeType ?? guessMime(ext);

  const response = await fetch(validUri);
  const blob = await response.blob();

  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error(
      `File too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${
        MAX_MEDIA_BYTES / 1024 / 1024
      } MB.`
    );
  }

  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = `${STORAGE_ROOT}/${chatId}/${uid}/${unique}`;
  const ref = storageRef(storage, path);

  await uploadBytes(ref, blob, { contentType: mime });
  const url = await getDownloadURL(ref);

  return { url, size: blob.size, mime, ext };
}

// Update the parent chat doc so the conversation list shows a preview.
async function touchChat(chatId: string, preview: string): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
  });
}

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
    onMessages(
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
    );
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
    // legacy (kept for old UI)
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: null,
    mediaMime: null,
    mediaSize: null,
    mediaName: null,
    mediaDurationMs: null,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, shortPreview(trimmed));
}

// ─────────────────────────────────────────────────────────
// Image messages (with optional caption)
// ─────────────────────────────────────────────────────────
export async function sendImageMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  caption: string = ""
): Promise<void> {
  const upload = await uploadMedia(chatId, me.uid, localUri, {
    extension: getExtension(localUri, "jpg"),
  });

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "image",
    text: caption.trim(),
    // legacy
    imageUrl: upload.url,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: upload.url,
    mediaMime: upload.mime,
    mediaSize: upload.size,
    mediaName: null,
    mediaDurationMs: null,
    thumbnailUrl: upload.url, // reuse; generate a thumb in a later pass
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, caption ? `📷 ${shortPreview(caption)}` : "📷 Photo");
}

// ─────────────────────────────────────────────────────────
// Video messages (with optional caption)
// ─────────────────────────────────────────────────────────
export async function sendVideoMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  options?: { caption?: string; durationMs?: number; thumbnailUri?: string }
): Promise<void> {
  const caption = (options?.caption ?? "").trim();
  const upload = await uploadMedia(chatId, me.uid, localUri, {
    extension: getExtension(localUri, "mp4"),
    mimeType: guessMime(getExtension(localUri, "mp4")),
  });

  // Optional: thumbnail upload (the caller can generate one with
  // react-native-thumbnail-video / expo-video-thumbnails).
  let thumbnailUrl: string | null = null;
  if (options?.thumbnailUri) {
    try {
      const thumb = await uploadMedia(chatId, me.uid, options.thumbnailUri, {
        extension: "jpg",
      });
      thumbnailUrl = thumb.url;
    } catch {
      thumbnailUrl = null;
    }
  }

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "video",
    text: caption,
    // legacy
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: upload.url,
    mediaMime: upload.mime,
    mediaSize: upload.size,
    mediaName: null,
    mediaDurationMs: options?.durationMs ?? null,
    thumbnailUrl,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, caption ? `🎥 ${shortPreview(caption)}` : "🎥 Video");
}

// ─────────────────────────────────────────────────────────
// Voice messages (recorded inside the app)
// ─────────────────────────────────────────────────────────
export async function sendVoiceMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  durationMs: number
): Promise<void> {
  const upload = await uploadMedia(chatId, me.uid, localUri, {
    extension: getExtension(localUri, "m4a"),
    mimeType: guessMime(getExtension(localUri, "m4a")),
  });

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "voice",
    text: "",
    // legacy
    imageUrl: null,
    voiceUrl: upload.url,
    voiceDurationMs: durationMs,
    // new
    mediaUrl: upload.url,
    mediaMime: upload.mime,
    mediaSize: upload.size,
    mediaName: null,
    mediaDurationMs: durationMs,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, "🎤 Voice message");
}

// ─────────────────────────────────────────────────────────
// Audio messages (music / audio files — NOT voice recordings)
// ─────────────────────────────────────────────────────────
export async function sendAudioMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  fileName?: string,
  durationMs?: number
): Promise<void> {
  const ext = fileName
    ? getExtension(fileName, "mp3")
    : getExtension(localUri, "mp3");
  const upload = await uploadMedia(chatId, me.uid, localUri, {
    extension: ext,
    fileNameHint: fileName,
  });

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "audio",
    text: "",
    // legacy
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: upload.url,
    mediaMime: upload.mime,
    mediaSize: upload.size,
    mediaName: fileName ?? `audio.${ext}`,
    mediaDurationMs: durationMs ?? null,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, "🎵 Audio");
}

// ─────────────────────────────────────────────────────────
// Document messages (any file)
// ─────────────────────────────────────────────────────────
export async function sendDocumentMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  fileName?: string,
  mimeType?: string
): Promise<void> {
  const ext = fileName
    ? getExtension(fileName, "bin")
    : getExtension(localUri, "bin");
  const displayName = fileName ?? `file.${ext}`;

  const upload = await uploadMedia(chatId, me.uid, localUri, {
    extension: ext,
    mimeType,
    fileNameHint: displayName,
  });

  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "document",
    text: "",
    // legacy
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: upload.url,
    mediaMime: upload.mime,
    mediaSize: upload.size,
    mediaName: displayName,
    mediaDurationMs: null,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(chatId, `📎 ${shortPreview(displayName, 40)}`);
}

// ─────────────────────────────────────────────────────────
// Generic dispatcher — auto-detects media type from extension.
// Use this from a single "attach file" button in the UI.
// ─────────────────────────────────────────────────────────
export async function sendFileMessage(
  chatId: string,
  me: GarbaCrewUser,
  localUri: string,
  fileName?: string,
  caption?: string
): Promise<void> {
  const ext = fileName
    ? getExtension(fileName, "bin")
    : getExtension(localUri, "bin");
  const mime = guessMime(ext);

  if (mime.startsWith("image/")) {
    return sendImageMessage(chatId, me, localUri, caption);
  }
  if (mime.startsWith("video/")) {
    return sendVideoMessage(chatId, me, localUri, { caption });
  }
  if (mime.startsWith("audio/")) {
    return sendAudioMessage(chatId, me, localUri, fileName);
  }
  return sendDocumentMessage(chatId, me, localUri, fileName, mime);
}

// ─────────────────────────────────────────────────────────
// Location messages
// ─────────────────────────────────────────────────────────
export async function sendLocationMessage(
  chatId: string,
  me: GarbaCrewUser,
  latitude: number,
  longitude: number,
  isLive: boolean = false,
  address?: string
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    fromUid: me.uid,
    fromName: me.name ?? "Someone",
    fromPhotoUrl: me.photoUrl ?? null,
    type: "location",
    text: "",
    // legacy
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: null,
    mediaMime: null,
    mediaSize: null,
    mediaName: null,
    mediaDurationMs: null,
    thumbnailUrl: null,
    latitude,
    longitude,
    address: address ?? null,
    isLive,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });

  await touchChat(
    chatId,
    isLive ? "📍 Live location" : address ? `📍 ${shortPreview(address, 40)}` : "📍 Location"
  );
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
    // legacy
    imageUrl: null,
    voiceUrl: null,
    voiceDurationMs: null,
    // new
    mediaUrl: null,
    mediaMime: null,
    mediaSize: null,
    mediaName: null,
    mediaDurationMs: null,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    isLive: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────
// Soft-delete a message (sender only — enforced by UI)
// ─────────────────────────────────────────────────────────
export async function deleteMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    text: "",
    mediaUrl: null,
    imageUrl: null,
    voiceUrl: null,
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    address: null,
    deletedAt: serverTimestamp(),
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