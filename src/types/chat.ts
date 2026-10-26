export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location';

export interface BaseMessage {
  id: string;
  senderId: string;
  senderName: string;
  createdAt: number; // timestamp ms
  type: MessageType;
  text?: string; // caption or text content
}

export interface MediaMessage extends BaseMessage {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string; // for images/videos
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  url: string;
  duration: number; // seconds
  waveform?: number[]; // optional for UI
}

export interface LocationMessage extends BaseMessage {
  type: 'location';
  latitude: number;
  longitude: number;
  address?: string; // optional reverse-geocoded
}

export type ChatMessage = BaseMessage | MediaMessage | VoiceMessage | LocationMessage;