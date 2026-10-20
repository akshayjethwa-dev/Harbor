// src/types/photo.ts
import { Timestamp } from "firebase/firestore";

export interface PlanPhoto {
  id: string;
  planId: string;
  url: string;
  storagePath: string;
  
  uploaderUid: string;
  uploaderName: string;
  uploaderPhotoUrl: string | null;
  
  fileName: string;
  fileSize: number; // in bytes
  width: number;
  height: number;
  
  isReported: boolean;
  createdAt: Timestamp | any;
}