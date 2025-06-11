// <<< ADD GENERIC API RESPONSE WRAPPER >>>
export interface ApiResponse<T = any> { // Use generic T, default to any
  status: 'success' | 'error';
  message?: string; // Optional message
  data?: T; // The actual data payload
  // Potentially add error details if status is 'error'
  errors?: any[]; // Example for Zod errors
}

// Based on components.schemas.ProfileDTO in NoteEarly-swagger-2.json

export type UserRole = "ADMIN" | "STUDENT" | "SUPER_ADMIN";
export type SubscriptionStatus = "free" | "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing";
export type SubscriptionPlanTier = "free" | "home" | "pro";
export type ModuleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ModuleGenre = "History" | "Adventure" | "Science" | "Non-Fiction" | "Fantasy" | "Biography" | "Mystery" | "Science-Fiction" | "Folktale" | "Custom";
export type ModuleLanguage = "UK" | "US";
export type ModuleType = "curated" | "custom";

// Define Role Enum based on ProfileDTO.role
export type ProfileRole = "ADMIN" | "STUDENT" | "SUPER_ADMIN";

// Define a base type for common profile fields
interface BaseProfile {
  profileId: string; // uuid
  role: ProfileRole;
  fullName: string | null;
  email?: string | null; // <<< Made email optional/nullable
  avatarUrl: string | null; // url format
  createdAt: string; // date-time format
  updatedAt: string; // date-time format
}

// Define ProfileDTO based on Swagger components.schemas.ProfileDTO
export interface ProfileDTO extends BaseProfile {
  // Admin/SuperAdmin specific fields (nullable for students)
  stripeCustomerId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptionPlan?: SubscriptionPlanTier | null;
  subscriptionRenewalDate?: string | null; // date-time format

  // Student specific fields (nullable for admins)
  adminId?: string | null; // uuid, Link to managing admin
  age?: number | null; // int32
  readingLevel?: number | null; // int
  completedModulesCount?: number | null; // Added based on updated backend/swagger
}

// Based on components.schemas.AdminLoginInput
export interface AdminLoginInput {
    email: string;
    password: string;
}

// Based on components.schemas.AdminSignupInput
export interface AdminSignupInput {
    email: string;
    password: string;
    fullName: string;
}

// Based on components.schemas.StudentLoginInput
export interface StudentLoginInput {
    studentId: string; // uuid
    pin: string;
}

// Based on request body for POST /auth/reset-password
export interface ResetPasswordInput {
    currentPassword: string;
    newPassword: string;
}

// Based on components.schemas.CreateStudentInput
export interface CreateStudentInput {
    fullName: string;
    pin: string; // MinLength 4, MaxLength 6? (Check Swagger, spec says 4) Pattern \d+
}

// Based on components.schemas.ResetStudentPinInput
export interface ResetStudentPinInput {
    studentId: string; // uuid
    newPin: string; // MinLength 4, MaxLength 4? (Check Swagger, spec says 4), Pattern \d+
}

// Based on components.schemas.ProfileUpdateRequest
export interface ProfileUpdateRequest {
  fullName?: string;
  avatarUrl?: string | null; // url format
}

// Add other DTOs here as needed, e.g.:
// export interface ReadingModuleDTO { ... }
// export interface StudentProgressSchema { ... }
// ... etc. 

// Base types from Swagger Schemas (components.schemas)

// --- REMOVE DUPLICATE TYPE ALIASES BELOW --- 

// --- Input Schemas ---

export interface AdminSignupInput {
    email: string;
    password: string;
    fullName: string;
}

export interface AdminLoginInput {
    email: string;
    password: string;
}

export interface StudentLoginInput {
    studentId: string; // uuid
    pin: string; // pattern: ^\d+$, minLength: 4, maxLength: 4
}

export interface CreateStudentInput {
    fullName: string;
    pin: string; // pattern: ^\d+$, minLength: 4, maxLength: 4
}

export interface ResetStudentPinInput {
    studentId: string; // uuid
    newPin: string; // pattern: ^\d+$, minLength: 4, maxLength: 4
}

export interface ParagraphInput {
    index: number; // minimum: 1 (exclusiveMinimum: 0)
    text: string;
}

export interface CreateModuleInput {
    title: string;
    structuredContent: ParagraphInput[];
    level: ModuleLevel;
    genre: ModuleGenre;
    language: ModuleLanguage;
    description?: string | null;
    imageUrl?: string | null; // format: uri
    estimatedReadingTime?: number | null; // minimum: 1 (exclusiveMinimum: 0)
    authorFirstName?: string | null;
    authorLastName?: string | null;
    isActive?: boolean; // Note: Schema doesn't show required, but might be needed
}

// UpdateModuleInput seems identical to CreateModuleInput in the schema provided
export type UpdateModuleInput = Partial<CreateModuleInput>; // Use Partial if fields are optional on update

// CreateCuratedModuleInput is identical to CreateModuleInput
export type CreateCuratedModuleInput = CreateModuleInput;

export interface StartModuleInput {
    moduleId: string; // uuid
}

export interface SubmitSummaryInput {
    moduleId: string; // uuid
    paragraphIndex: number; // minimum: 1
    paragraphSummary: string;
    cumulativeSummary: string;
}

export interface AdminUpdateProgressInput {
    score?: number | null; // minimum: 0, maximum: 100
    teacherFeedback?: string | null;
    completed?: boolean;
}

export interface ProfileUpdateRequest {
  fullName?: string;
  avatarUrl?: string | null; // url format
}

export interface ResetPasswordInput {
    currentPassword: string;
    newPassword: string;
}

// Renaming VocabularyBodyInput to VocabularyBodySchema to match Swagger
export interface VocabularyBodySchema { 
    paragraphIndex: number; // minimum: 1
    word: string;
    description: string;
}

// UpdateVocabularyBodySchema implies partial update
// Keep this as UpdateVocabularyInput for now, or rename if needed elsewhere
export type UpdateVocabularyInput = Partial<VocabularyBodySchema>;


// --- Data Transfer Objects (DTOs) / Response Schemas ---

export interface Paragraph {
    index: number;
    text: string;
}

export interface StudentProgressSchema {
    id: string; // uuid
    studentId: string; // uuid
    moduleId: string; // uuid
    completed: boolean;
    score?: number | null;
    highestParagraphIndexReached?: number | null;
    finalSummary?: string | null;
    startedAt?: string | null; // Assuming ISO date string
    completedAt?: string | null; // Assuming ISO date string
    timeSpentMinutes?: number | null;
    createdAt: string; // Assuming ISO date string
    updatedAt: string; // Assuming ISO date string
    teacherFeedback?: string | null;
    teacherFeedbackAt?: string | null; // Assuming ISO date string
}

export interface ParagraphSubmissionSchema {
    id: string; // uuid
    studentProgressId: string; // uuid
    paragraphIndex: number;
    paragraphSummary: string;
    cumulativeSummary: string;
    submittedAt: string; // Assuming ISO date string
    createdAt: string; // Assuming ISO date string
    updatedAt: string; // Assuming ISO date string
}

export interface StudentProgressDetailsDTO {
    progress?: StudentProgressSchema | null;
    submissions: ParagraphSubmissionSchema[];
}

export interface ReadingModuleDTO {
    id: string;
    adminId?: string;
    title: string;
    description?: string | null;
    type: ModuleType;
    genre: ModuleGenre;
    level: ModuleLevel;
    language: ModuleLanguage;
    createdAt: string;
    updatedAt: string;
    paragraphCount: number;
    structuredContent: Paragraph[];
    imageUrl?: string | null;
    estimatedReadingTime?: number | null;
    isActive?: boolean;
    authorFirstName?: string | null;
    authorLastName?: string | null;
    progress?: {
        percentage: number;
        isCompleted: boolean;
    };
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string | null;
    price: string;
    interval: 'month' | 'year';
    tier: SubscriptionPlanTier;
    studentLimit: number;
    moduleLimit: number;
    customModuleLimit: number;
    isActive: boolean;
    createdAt: string; // date-time format
    updatedAt: string; // date-time format
}

export interface ManageSubscriptionResponse {
    url: string; // url format
}

export interface VocabularyDTO {
    id: string; // uuid
    moduleId: string; // uuid
    paragraphIndex: number;
    word: string;
    description: string;
    createdAt: string; // Assuming date-time format based on usual DB fields
    updatedAt: string; // Assuming date-time format based on usual DB fields
}

export interface ReadingParagraphDTO {
    index: number;
    text: string;
    vocabulary: VocabularyDTO[];
}

export interface VocabularyEntryDTO {
    id: string; // uuid
    moduleId: string; // uuid
    paragraphIndex: number;
    word: string;
    description: string;
}

// Generic response types (can be customized)
export interface SuccessMessageResponse {
    message: string;
}

// --- Analytics Response Examples (Shape based on example values) ---
// NOTE: These are examples; actual structure might vary.

export interface AnalyticsDashboardStats {
    totalStudents: number;
    activeSubscriptions: number;
    averageProgress: number;
    popularModule: string;
}

export interface AnalyticsStudentStats {
    studentName: string;
    completedModules: number;
    averageScore: number;
    timeSpent: number;
}

export interface AnalyticsPopularModule {
    moduleId: string;
    title: string;
    completionRate: number;
}

export interface AnalyticsSubscriptionStats {
    totalActive: number;
    freeTier: number;
    homeTier: number;
    proTier: number;
    monthlyRevenue: number;
}

// --- ADD NEW TYPE DEFINITION HERE ---
export interface CustomerSubscriptionDTO {
    id: string;                     // Stripe Subscription ID (sub_...)
    userId: string;                 // Link to user profile
    planId: string;                 // Link to the specific Stripe Price ID (matches SubscriptionPlan.id)
    stripeCustomerId: string;       // Stripe Customer ID (cus_...)
    status: SubscriptionStatus;     // Use the existing SubscriptionStatus type alias
    currentPeriodStart: string;     // ISO Date string
    currentPeriodEnd: string;       // ISO Date string (important for reset display)
    cancelAtPeriodEnd: boolean;
    customModulesCreatedThisPeriod: number; // The counter we need!
    // Add other relevant fields if returned by the backend and needed by frontend
    // createdAt?: string;
    // updatedAt?: string;
}
// --- END NEW TYPE DEFINITION --- 


  export interface AdminUpdateStudentRequest {
    fullName: string;
    avatarUrl: string | null;
    age: number | null;
    readingLevel: number | null;
  }