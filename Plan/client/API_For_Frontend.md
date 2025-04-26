# NoteEarly API Documentation for Frontend Client (Generated from Swagger JSON)

This document outlines the backend API endpoints, expected data structures (schemas), and relevant types for building the NoteEarly frontend client, based on the backend's OpenAPI specification (`NoteEarly-swagger-2.json`).

**Base URL:**

- **Development:** `http://localhost:4000/api/v1` (as specified in `servers`)
- Frontend should use an environment variable (e.g., `NEXT_PUBLIC_API_BASE_URL`) to point to the deployed backend URL.

**Authentication:**

- **Method:** **JWT Bearer Token**.
- Most endpoints require authentication, indicated by `security: [{"bearerAuth": []}]` in the Swagger definition.
- The frontend API client (`apiClient` wrapper) must include the JWT token in the `Authorization` header for authenticated requests: `Authorization: Bearer <YOUR_JWT_TOKEN>`.
- Tokens are obtained via login endpoints (`/auth/login`, `/auth/student/login`) and potentially refreshed via `/auth/refresh`.

**Key Schemas (Defined in `components.schemas`):**

- **Inputs:** `AdminSignupInput`, `AdminLoginInput`, `StudentLoginInput`, `CreateStudentInput`, `ResetStudentPinInput`, `CreateModuleInput`, `UpdateModuleInput`, `CreateCuratedModuleInput`, `StartModuleInput`, `SubmitSummaryInput`, `AdminUpdateProgressInputSchema`, `ProfileUpdateRequest`, `VocabularyBodySchema`, `UpdateVocabularyBodySchema`.
- **Data Transfer Objects (DTOs):** `ReadingModuleDTO`, `ProfileDTO`, `SubscriptionPlan`, `ProgressRecordDTO` (likely represented by `StudentProgressSchema` in responses), `ParagraphSubmission`, `StudentProgressDetailsDTOSchema`, `VocabularyEntryDTO`.
- **Parameters:** `IdParam`, `ProgressIdParam`, `StudentIdParam`, `ModuleIdParam`, `ProfileIdParam`, `ParagraphIndexParam`, `VocabularyId` (defined under `components.parameters`).
- **Responses:** `ErrorResponse`, `SuccessResponse`.
- **Core Types:** `Paragraph`.

_(Refer to the `components.schemas` section in `NoteEarly-swagger-2.json` for detailed property definitions, types, and constraints for each schema.)_

---

## API Endpoints

_(Endpoints listed below are directly from the `paths` section of `NoteEarly-swagger-2.json`.)_

### Analytics (`/analytics`) - SuperAdmin Only

- **GET `/analytics/dashboard`**: Get teacher dashboard statistics.
  - Security: Bearer Auth
  - Response (200): Example dashboard stats.
- **GET `/analytics/students/{studentId}`**: Get progress analytics for a specific student.
  - Security: Bearer Auth
  - Path Parameter: `studentId` (UUID)
  - Response (200): Example student analytics.
- **GET `/analytics/modules/popular`**: Get the most popular modules.
  - Security: Bearer Auth
  - Response (200): Array of popular module examples.
- **GET `/analytics/subscriptions`**: Get subscription statistics.
  - Security: Bearer Auth
  - Response (200): Example subscription stats.

### Authentication (`/auth`)

- **POST `/auth/signup`** (Public): Register a new Admin/SuperAdmin user.
  - Request Body: `AdminSignupInput`
  - Response (201): Success message.
- **POST `/auth/login`** (Public): Log in an Admin/SuperAdmin user.
  - Request Body: `AdminLoginInput`
  - Response (200): User info (likely `ProfileDTO`) and sets auth cookie/token.
- **GET `/auth/google`** (Public): Initiate Google OAuth login flow.
  - Response (200): Redirect URL for Google OAuth.
- **GET `/auth/callback`** (Public): Handle Google OAuth callback.
  - Query Parameter: `code` (string)
  - Response (302): Redirects after setting auth cookie/token.
- **POST `/auth/student/login`** (Student): Log in a Student user.
  - Request Body: `StudentLoginInput`
  - Response (200): Student profile (likely `ProfileDTO`) and student-specific token.
- **POST `/auth/refresh`** (Public): Refresh access token using refresh token cookie.
  - Response (200): New access token.
- **POST `/auth/logout`** (Admin/SuperAdmin): Log out an Admin/SuperAdmin user.
  - Security: Bearer Auth
  - Response (200): Success message.
- **POST `/auth/reset-password`** (Admin/SuperAdmin): Reset own password.
  - Security: Bearer Auth
  - Request Body: `{ currentPassword, newPassword }` (Check schema for exact details)
  - Response (200): Success message.
- **POST `/auth/admin/student`** (Admin/SuperAdmin): Create a new student profile.
  - Security: Bearer Auth
  - Request Body: `CreateStudentInput`
  - Response (201): Success message.
- **POST `/auth/admin/student/reset-pin`** (Admin/SuperAdmin): Reset a specific student's PIN.
  - Security: Bearer Auth
  - Request Body: `ResetStudentPinInput`
  - Response (200): Success message.

### Progress Tracking (`/progress`)

- **POST `/progress/start`** (Student): Start progress on a module.
  - Security: Bearer Auth
  - Request Body: `StartModuleInput`
  - Response (200): `{ message: string, progress: StudentProgressSchema }`
- **POST `/progress/submit-summary`** (Student): Submit a paragraph summary.
  - Security: Bearer Auth
  - Request Body: `SubmitSummaryInput`
  - Response (201): `{ message: string, submissionId: string, progressStatus: { completed: boolean, highestParagraphIndexReached: number|null, finalSummary: string|null } }`
- **GET `/progress/details/{moduleId}`** (Student): Get detailed progress for a specific module.
  - Security: Bearer Auth
  - Path Parameter: `moduleId` (using `ModuleIdParam`)
  - Response (200): `StudentProgressDetailsDTOSchema`
- **GET `/progress/my-progress`** (Student): Get all progress records for the current student.
  - Security: Bearer Auth
  - Response (200): `StudentProgressSchema[]`
- **PATCH `/progress/admin/update/{progressId}`** (Admin/SuperAdmin): Update a student's progress record (feedback, score, etc.).
  - Security: Bearer Auth
  - Path Parameter: `progressId` (using `ProgressIdParam`)
  - Request Body: `AdminUpdateProgressInputSchema`
  - Response (200): `StudentProgressSchema`
- **GET `/progress/admin/module/{moduleId}`** (Admin/SuperAdmin): Get all progress records for a specific module.
  - Security: Bearer Auth
  - Path Parameter: `moduleId` (using `ModuleIdParam`)
  - Response (200): `StudentProgressSchema[]`

### Reading Modules (`/reading-modules`)

- **GET `/reading-modules/active`** (Public): Get active reading modules (list may vary based on auth/subscription).
  - Response (200): `ReadingModuleDTO[]`
- **GET `/reading-modules/{id}`** (Public): Get a specific module by ID.
  - Path Parameter: `id` (UUID)
  - Response (200): `ReadingModuleDTO`
- **PATCH `/reading-modules/{id}`** (Admin/SuperAdmin): Update a specific module (owned custom module or any if SuperAdmin).
  - Security: Bearer Auth
  - Path Parameter: `id` (UUID)
  - Request Body: `UpdateModuleInput`
  - Response (200): `ReadingModuleDTO`
- **DELETE `/reading-modules/{id}`** (Admin/SuperAdmin): Delete a specific module (owned custom module or any if SuperAdmin).
  - Security: Bearer Auth
  - Path Parameter: `id` (UUID)
  - Response (204): No Content.
- **GET `/reading-modules/{moduleId}/paragraph/{paragraphIndex}`** (Public): Get a specific paragraph from a module.
  - Path Parameters: `moduleId` (UUID), `paragraphIndex` (integer >= 1)
  - Response (200): `Paragraph`
- **GET `/reading-modules/my-modules`** (Admin/SuperAdmin): Get modules created by the logged-in admin.
  - Security: Bearer Auth
  - Response (200): `ReadingModuleDTO[]`
- **POST `/reading-modules`** (Admin/SuperAdmin): Create a new custom reading module.
  - Security: Bearer Auth
  - Request Body: `CreateModuleInput`
  - Response (201): `ReadingModuleDTO`
- **POST `/reading-modules/curated`** (SuperAdmin Only): Create a new curated reading module.
  - Security: Bearer Auth
  - Request Body: `CreateCuratedModuleInput`
  - Response (201): `ReadingModuleDTO`
- **PATCH `/reading-modules/curated/{id}`** (SuperAdmin Only): Update _any_ module (including curated).
  - Security: Bearer Auth
  - Path Parameter: `id` (using `IdParam`)
  - Request Body: `UpdateModuleInput`
  - Response (200): `ReadingModuleDTO`
- **DELETE `/reading-modules/curated/{id}`** (SuperAdmin Only): Delete _any_ module (including curated).
  - Security: Bearer Auth
  - Path Parameter: `id` (using `IdParam`)
  - Response (204): No Content.

### Vocabulary (`/vocabulary` and `/reading-modules/{moduleId}/vocabulary`)

- **GET `/reading-modules/{moduleId}/paragraphs/{paragraphIndex}/vocabulary`** (Public): Get vocabulary for a specific paragraph.
  - Path Parameters: `moduleId` (UUID), `paragraphIndex` (integer >= 1)
  - Response (200): `VocabularyEntryDTO[]`
- **POST `/reading-modules/{moduleId}/vocabulary`** (Admin/SuperAdmin): Create a vocabulary entry for a module.
  - Security: Bearer Auth
  - Path Parameter: `moduleId` (UUID)
  - Request Body: `VocabularyBodySchema`
  - Response (201): `VocabularyEntryDTO`
- **GET `/reading-modules/{moduleId}/vocabulary`** (Admin/SuperAdmin): Get all vocabulary entries for a module.
  - Security: Bearer Auth
  - Path Parameter: `moduleId` (UUID)
  - Response (200): `VocabularyEntryDTO[]`
- **PUT `/vocabulary/{vocabularyId}`** (Admin/SuperAdmin): Update a specific vocabulary entry.
  - Security: Bearer Auth
  - Path Parameter: `vocabularyId` (UUID)
  - Request Body: `UpdateVocabularyBodySchema`
  - Response (200): `VocabularyEntryDTO`
- **DELETE `/vocabulary/{vocabularyId}`** (Admin/SuperAdmin): Delete a specific vocabulary entry.
  - Security: Bearer Auth
  - Path Parameter: `vocabularyId` (UUID)
  - Response (204): No Content.

### Subscriptions (`/subscriptions`)

- **GET `/subscriptions/plans`** (Admin/SuperAdmin): Get available subscription plans.
  - Security: Bearer Auth
  - Response (200): `SubscriptionPlan[]`
- **POST `/subscriptions/manage`** (Admin/SuperAdmin): Create Stripe Customer Portal session link.
  - Security: Bearer Auth
  - Response (200): `{ url: string }`
- **POST `/subscriptions/stripe-webhook`** (Webhook): Handle incoming Stripe webhook events.
  - Request Body: Stripe Event Object
  - Response (200): `{ received: true }`

### Profiles (`/profiles`)

- **GET `/profiles/me`** (Self): Get current user's profile.
  - Security: Bearer Auth
  - Response (200): `ProfileDTO`
- **PATCH `/profiles/me`** (Self - Admin/SuperAdmin): Update current user's profile.
  - Security: Bearer Auth
  - Request Body: `ProfileUpdateRequest`
  - Response (200): `ProfileDTO`
- **GET `/profiles/admin/students`** (Admin/SuperAdmin): Get profiles managed by the admin (e.g., students).
  - Security: Bearer Auth
  - Response (200): `ProfileDTO[]`
- **GET `/profiles/admin/students/{profileId}`** (Admin/SuperAdmin): Get a specific profile managed by the admin.
  - Security: Bearer Auth
  - Path Parameter: `profileId` (UUID)
  - Response (200): `ProfileDTO`
- **PATCH `/profiles/admin/students/{profileId}`** (Admin/SuperAdmin): Update a specific profile managed by the admin.
  - Security: Bearer Auth
  - Path Parameter: `profileId` (UUID)
  - Request Body: `ProfileUpdateRequest` (Note: Reuses the same schema as self-update)
  - Response (200): `ProfileDTO`
- **DELETE `/profiles/admin/students/{profileId}`** (Admin/SuperAdmin): Delete a specific profile managed by the admin.
  - Security: Bearer Auth
  - Path Parameter: `profileId` (UUID)
  - Response (200): Success message (Verify actual response code/body).

---

**Error Handling:**

- Expect standard HTTP status codes (400, 401, 403, 404, 409, 500).
- Error responses generally follow the `ErrorResponse` schema: `{ message: string }`. Specific validation errors might be detailed further depending on backend implementation.
- The frontend `apiClient` should handle these status codes and parse the error messages appropriately.
