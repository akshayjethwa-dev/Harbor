import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export interface UnreadCounts {
  plans: number;   // pending join requests where I'm the host
  squads: number;  // new squad invites / unread squad chats
  partners: number; // unread partner match messages
}

export function useUnreadCounts(): UnreadCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({
    plans: 0,
    squads: 0,
    partners: 0,
  });

  // Plans: count plans I host that have pending requests
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "plans"),
      where("hostUid", "==", user.uid),
      where("status", "in", ["open", "full"])
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach((d) => {
        const reqs = d.data().pendingRequests ?? [];
        total += reqs.length;
      });
      setCounts((c) => ({ ...c, plans: total }));
    });
    return () => unsub();
  }, [user]);

  // Partners: count matches awaiting my first message
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "partnerMatches"),
      where("users", "array-contains", user.uid),
      where("status", "==", "pending_first_message")
    );
    const unsub = onSnapshot(q, (snap) => {
      setCounts((c) => ({ ...c, partners: snap.size }));
    });
    return () => unsub();
  }, [user]);

  return counts;
}