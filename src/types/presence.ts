// src/types/presence.ts
import { Timestamp } from "firebase/firestore";

export interface PresenceRecord {
  uid: string;
  name: string;
  photoUrl: string | null;
  lastActiveAt: Timestamp | any;
  status: "active" | "away";
}