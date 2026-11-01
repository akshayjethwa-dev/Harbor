// src/hooks/useFilteredChats.ts
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { isChatAllowed } from "../services/chatGateService";

export function useFilteredChats(uid: string | undefined) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "chats"),
      where("users", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // ✅ FIX: Cast d.data() as any to prevent "Property does not exist" errors
      const rawChats = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      // Filter chats based on the gate rules
      const validChats = [];
      for (const chat of rawChats) {
        const otherUid = (chat.users as string[])?.find((u) => u !== uid);
        if (!otherUid) continue;

        // If the chat is a plan opt-in chat, pass the planId; otherwise it's a direct/partner chat
        const allowed = await isChatAllowed(uid, otherUid, chat.planId);
        if (allowed.allowed) {
          validChats.push(chat);
        }
      }

      setChats(validChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { chats, loading };
}