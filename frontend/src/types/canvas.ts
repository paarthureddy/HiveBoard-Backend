export type UserRole = 'owner' | 'editor' | 'viewer' | 'guest';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId: string;
  rotation?: number; // radians
  center?: Point; // Pivot for rotation
  isFill?: boolean; // If true, points define a filled polygon
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  color: string;
  cursorPosition?: { x: number; y: number };
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  guestId?: string;
  userName: string;
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  rotation?: number;
  width?: number;
  height?: number;
}

export interface CroquisItem {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  isLocked: boolean;
  isFlipped: boolean;
  rotation?: number;
}

export interface CanvasElement {
  id: string;
  type: 'path' | 'shape' | 'text' | 'image';
  data: any;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  isLocked: boolean;
  chatEnabled: boolean;
  aiEnabled: boolean;
}

// Presence colors for different users
export const PRESENCE_COLORS = [
  '#D4A574', // Rose gold
  '#C9B896', // Gold
  '#8B9FA6', // Slate
  '#A6998B', // Taupe
  '#9BA68B', // Sage
  '#A68B9B', // Mauve
  '#8BA6A6', // Teal
  '#A6948B', // Terracotta
];

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'owner': return 'hsl(38 70% 55%)';
    case 'editor': return 'hsl(15 45% 60%)';
    case 'viewer': return 'hsl(210 15% 60%)';
    case 'guest': return 'hsl(30 10% 65%)';
    default: return 'hsl(30 10% 65%)';
  }
};

export const getRoleBadge = (role: UserRole): string => {
  switch (role) {
    case 'owner': return 'Owner';
    case 'editor': return 'Editor';
    case 'viewer': return 'Viewer';
    case 'guest': return 'Guest';
    default: return 'Guest';
  }
};
