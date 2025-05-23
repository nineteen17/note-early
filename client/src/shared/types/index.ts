// User Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  SUPER_ADMIN = 'SUPER_ADMIN'
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
  CURATED = 'curated',
  CUSTOM = 'custom',
}

// Language Enum
export enum Language {
  UK = 'UK',
  US = 'US',
}

// Define allowed genres
export const allowedGenres = ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom'] as const;
export type Genre = typeof allowedGenres[number];

// Define Paragraph type for shared use
export interface Paragraph {
  index: number;
  text: string;
}

// Reading module types
export interface ReadingModule {
  id: string;
  adminId?: string;
  title: string;
  structuredContent: Paragraph[];
  paragraphCount: number;
  level: ReadingLevel;
  type: ModuleType;
  genre: Genre;
  language: Language;
  authorFirstName?: string | null;
  authorLastName?: string | null;
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

// Student Progress Details DTO
export interface StudentProgressDetailsDTO {
  progress: {
    id: string;
    studentId: string;
    moduleId: string;
    completed: boolean;
    score: number | null;
    highestParagraphIndexReached: number | null;
    finalSummary: string | null;
    startedAt: string | null;
    completedAt: string | null;
    timeSpentMinutes: number | null;
    createdAt: string;
    updatedAt: string;
    teacherFeedback: string | null;
    teacherFeedbackAt: string | null;
  } | null;
  submissions: Array<{
    id: string;
    studentProgressId: string;
    paragraphIndex: number;
    paragraphSummary: string;
    cumulativeSummary: string;
    submittedAt: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

/**
 * Type for the submission payload
 */
export interface SubmitSummaryInput {
  moduleId: string;
  paragraphIndex: number;
  paragraphSummary: string;
  cumulativeSummary: string;
}