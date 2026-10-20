// src/services/commentService.ts
import { db } from "../lib/firebase";
import {
  collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import { PlanComment, CommentItemType } from "../types/comment";

const commentsRef = (planId: string) => collection(db, "plans", planId, "comments");

export function subscribeToComments(
  planId: string,
  itemId: string,
  callback: (comments: PlanComment[]) => void
) {
  const q = query(
    commentsRef(planId),
    where("itemId", "==", itemId),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map(d => ({ id: d.id, planId, ...d.data() } as PlanComment));
    callback(comments);
  });
}

export async function addComment(
  planId: string,
  itemId: string,
  itemType: CommentItemType,
  text: string,
  user: { uid: string; name: string; photoUrl: string | null },
  parentId: string | null = null
): Promise<void> {
  await addDoc(commentsRef(planId), {
    planId,
    itemId,
    itemType,
    parentId,
    text: text.trim(),
    authorUid: user.uid,
    authorName: user.name,
    authorPhotoUrl: user.photoUrl,
    isDeleted: false,
    isReported: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function editComment(
  planId: string,
  commentId: string,
  newText: string
): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "comments", commentId), {
    text: newText.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteComment(
  planId: string,
  commentId: string
): Promise<void> {
  // Soft delete: mark as deleted, change text
  await updateDoc(doc(db, "plans", planId, "comments", commentId), {
    isDeleted: true,
    text: "[This comment was deleted]",
    updatedAt: serverTimestamp(),
  });
}

export async function reportComment(
  planId: string,
  commentId: string
): Promise<void> {
  await updateDoc(doc(db, "plans", planId, "comments", commentId), {
    isReported: true,
  });
}