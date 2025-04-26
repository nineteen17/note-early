// User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Subscription Plans
export enum SubscriptionPlan {
  FREE = 'free',
  HOME = 'home',
  PRO = 'pro',
}

// Reading Module Level
export enum ReadingLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5,
  LEVEL_6 = 6,
  LEVEL_7 = 7,
  LEVEL_8 = 8,
  LEVEL_9 = 9,
  LEVEL_10 = 10,
}

// Module Type Enum
export enum ModuleType {
  CURATED = 'Adventure',
  CUSTOM = 'custom',
}

// --- ADDED Language Enum ---
export enum Language {
  UK = 'UK',
  US = 'US',
}

// Define allowed genres for the NEW genre column
export const allowedGenres = ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom'] as const;
export type Genre = typeof allowedGenres[number];

// Base response type for all API responses
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

// Profile types
export interface BaseProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
}

export interface AdminProfile extends BaseProfile {
  role: UserRole.ADMIN;
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionPlan;
  subscriptionRenewalDate?: Date;
}

export interface StudentProfile extends BaseProfile {
  role: UserRole.STUDENT;
  adminId: string;
  pin: string; // Hashed 4-digit PIN
  age?: number | null;
  readingLevel?: ReadingLevel | null;
}

// Define Paragraph type for shared use
export type Paragraph = { index: number; text: string };

// Reading module types
export interface ReadingModule {
  id: string;
  adminId?: string; // Only for custom modules
  title: string;
  structuredContent: Paragraph[];
  paragraphCount: number;
  level: ReadingLevel;
  type: 'curated' | 'custom';
  genre: Genre;
  language: Language; // --- ADDED Language
  // --- NEW AUTHOR FIELDS (Shared DTO) ---
  authorFirstName?: string | null; // Optional
  authorLastName?: string | null;  // Optional
  // --- END NEW AUTHOR FIELDS ---
  createdAt: Date;
}

// Progress tracking types
export interface StudentProgress {
  id: string;
  studentId: string;
  moduleId: string;
  completed: boolean;
  summaryText?: string;
  createdAt: Date;
}

// Vocabulary Entry Type
export interface VocabularyEntry {
  id: string;
  moduleId: string;
  paragraphIndex: number;
  word: string;
  description: string;
  // Optionally include createdAt/updatedAt if needed by frontend
} 