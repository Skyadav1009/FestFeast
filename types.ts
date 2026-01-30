export enum EventMode {
  OFFLINE = 'Offline',
  ONLINE = 'Online', // Webinars etc
  HYBRID = 'Hybrid'
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  EXPIRED = 'expired'
}

export enum SourceType {
  MANUAL = 'manual',
  AI = 'ai'
}

export interface FestEvent {
  _id: string; // Simulating MongoDB ObjectId
  title: string;
  slug: string;
  organizer: string; // College, Brand, or Society
  description: string;
  mode: EventMode;
  location: string; // Specific venue e.g. "JLN Stadium"
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  bookingDeadline: string; // ISO Date string
  entryFee: string; // e.g. "Free", "₹499"
  tags: string[];
  ticketLink: string;
  sourceUrl: string;
  sourceType: SourceType;
  aiConfidence?: number; // Nullable, 0-1
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export type EventInput = Omit<FestEvent, '_id' | 'createdAt' | 'updatedAt' | 'slug'>;

export interface User {
  id: string;
  username: string;
  role: 'admin';
  token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}