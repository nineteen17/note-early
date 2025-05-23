# Backend Implementation Plan: Admin Access to Student Progress

**Goal:** Enable authenticated Admins/SuperAdmins to view both a summary list and detailed progress (including paragraph submissions) for specific students they manage.

**1. Define New API Endpoints:**

*   **Endpoint A: Get All Progress Records for a Specific Student**
    *   **Method:** `GET`
    *   **Route:** `/api/v1/progress/admin/student/{studentId}`
    *   **Description:** Retrieves a list of all `StudentProgressSchema` records for a specific student, accessible only by an authorized Admin/SuperAdmin who manages that student.
    *   **Path Parameter:**
        *   `studentId` (string, format: uuid): The ID of the student whose progress is being requested.
    *   **Security:** `bearerAuth` (Admin, SuperAdmin roles required). Authorization check needed to ensure the admin manages the student.
    *   **Success Response (200 OK):**
        *   **Content Type:** `application/json`
        *   **Schema:** `array` of `StudentProgressSchema` (defined in `server/src/db/schema/student-progress.ts`)
    *   **Error Responses:** 400 (Invalid ID), 401 (Unauthorized), 403 (Forbidden - Admin doesn't manage student), 404 (Student not found), 500 (Server Error).

*   **Endpoint B: Get Detailed Progress for a Specific Student on a Specific Module**
    *   **Method:** `GET`
    *   **Route:** `/api/v1/progress/admin/student/{studentId}/module/{moduleId}`
    *   **Description:** Retrieves the detailed progress, including all paragraph submissions, for a specific student on a specific module. Accessible only by an authorized Admin/SuperAdmin who manages that student.
    *   **Path Parameters:**
        *   `studentId` (string, format: uuid): The ID of the student.
        *   `moduleId` (string, format: uuid): The ID of the module.
    *   **Security:** `bearerAuth` (Admin, SuperAdmin roles required). Authorization check needed to ensure the admin manages the student.
    *   **Success Response (200 OK):**
        *   **Content Type:** `application/json`
        *   **Schema:** `StudentProgressDetailsDTOSchema` (This will need to be formally defined, likely containing the `StudentProgressSchema` and an array of `ParagraphSubmissionSchema`).
    *   **Error Responses:** 400 (Invalid IDs), 401 (Unauthorized), 403 (Forbidden), 404 (Student, Module, or Progress record not found), 500 (Server Error).

**2. Service Layer (`server/src/modules/progress/services/progress.service.ts`):**

*   **New Method A:** `getStudentProgressForAdmin(adminId: string, studentId: string): Promise<StudentProgressSchema[]>`
    *   Verify the `adminId` manages the `studentId`. Throw 403/404 if not found or not managed.
    *   Query the `studentProgress` table using Drizzle, filtering by `studentId`.
    *   Return the array of progress records.
*   **New Method B:** `getDetailedStudentModuleProgressForAdmin(adminId: string, studentId: string, moduleId: string): Promise<{ progress: StudentProgressSchema | null; submissions: ParagraphSubmissionSchema[] }>`
    *   Verify the `adminId` manages the `studentId`.
    *   Fetch the main `StudentProgressSchema` record for the given `studentId` and `moduleId`. If not found, potentially throw 404 or return null progress.
    *   If progress record exists, fetch all associated `ParagraphSubmissionSchema` records from the `paragraphSubmissions` table, filtering by the `studentProgressId`.
    *   Return an object containing the progress record and the array of submissions. (This structure matches the existing `StudentProgressDetailsDTOSchema` concept).
*   **Existing Method:** `updateProgress(progressId: string, updates: UpdateProgressInput, isAdminUpdate: boolean)`
    *   Handles updates from Admins (feedback, score, completion).
    *   Sets `teacherFeedbackAt` timestamp when `isAdminUpdate` is true and feedback is provided.

**3. Controller Layer (`server/src/modules/progress/controllers/progress.controller.ts`):**

*   **New Controller Method A:** `getStudentProgressForAdmin` (Handler)
    *   Bind to `GET /api/v1/progress/admin/student/{studentId}` route.
    *   Extract `studentId` from `req.params`. Validate format (use Zod schema like `StudentIdParam`).
    *   Extract `adminId` from `req.user` (assuming authentication middleware adds user info).
    *   Call `progressService.getStudentProgressForAdmin(adminId, studentId)`.
    *   Handle potential errors from the service (403, 404) and wrap others (500).
    *   Return 200 OK with the array of progress records.
*   **New Controller Method B:** `getDetailedStudentModuleProgressForAdmin` (Handler)
    *   Bind to `GET /api/v1/progress/admin/student/{studentId}/module/{moduleId}` route.
    *   Extract `studentId` and `moduleId` from `req.params`. Validate format (use combined Zod schema).
    *   Extract `adminId` from `req.user`.
    *   Call `progressService.getDetailedStudentModuleProgressForAdmin(adminId, studentId, moduleId)`.
    *   Handle potential errors (403, 404, 500).
    *   Return 200 OK with the detailed progress object (`{ progress, submissions }`).
*   **Existing Controller Method:** `updateProgressByAdmin` (Handler, renamed from `updateProgressByTeacher`)
    *   Bind to `PATCH /api/v1/progress/admin/update/{progressId}` route.
    *   Extracts `progressId` and validated update data.
    *   Calls `progressService.updateProgress` with `isAdminUpdate: true`.
    *   Handles errors and returns updated progress.

**4. Routing (`server/src/modules/progress/routes/progress.routes.ts`):**

*   Add the new routes defined in Step 1.
*   Ensure existing `PATCH /admin/update/:progressId` route points to `updateProgressByAdmin` controller.
*   Apply necessary middleware:
    *   `authenticateAdmin` (or a similar middleware ensuring Admin/SuperAdmin role).
    *   Parameter validation middleware (using Zod schemas for path parameters).
    *   `asyncHandler` wrapper.
*   Connect routes to the new controller methods.

**5. Database Queries (Drizzle ORM):**

*   Leverage existing Drizzle schemas (`studentProgress`, `paragraphSubmissions`, `profiles`).
*   Use `db.select().from(studentProgress).where(...)` for fetching progress lists/records.
*   Use `db.select().from(paragraphSubmissions).where(...)` for fetching submissions.
*   Potentially use relations if defined in schemas for simpler querying, or perform separate queries.
*   Ensure authorization checks query the `profiles` table (`where(eq(profiles.id, studentId), eq(profiles.adminId, adminId))`).

**6. Testing:**

*   Add unit tests for new service methods (`getStudentProgressForAdmin`, `getDetailedStudentModuleProgressForAdmin`).
*   Add unit tests for new controller methods (`getStudentProgressForAdmin`, `getDetailedStudentModuleProgressForAdmin`) and the updated method (`updateProgressByAdmin`).
*   Add integration tests for the new `GET` endpoints and the existing `PATCH` endpoint, covering:
    *   Successful operations by authorized admin.
    *   Failure for unauthorized roles.
    *   Failure when admin does not manage the student.
    *   404 errors for non-existent IDs.
    *   Correct data structure in responses.

**7. Swagger Documentation (`Plan/client/swagger-docs-3.json`):**

*   Add complete path definitions for the two new `GET` endpoints.
*   Ensure path definition for `PATCH /admin/update/{progressId}` reflects usage by Admins/SuperAdmins.
*   Include tags (`Progress - Admin`), summary, description, security requirements (`bearerAuth`), parameters (with schemas), and all possible responses (200, 400, 401, 403, 404, 500) with appropriate schema references (`StudentProgressSchema`, `StudentProgressDetailsDTOSchema`).
*   Define the `StudentProgressDetailsDTOSchema` in the `components.schemas` section if it doesn't exist formally yet, referencing the existing `StudentProgressSchema` and `ParagraphSubmissionSchema`.

---

**Phase 2: Frontend Implementation (Client-Side)**

**Goal:** Display student progress on the student detail page (`/admin/students/[profileId]`) and allow admins to view submissions and provide feedback/scores.

**1. Student Detail Page (`client/src/app/(auth)/admin/students/[profileId]/page.tsx`):**

*   **New Component/Section:** Create a dedicated section or component (e.g., `StudentProgressOverview`) within the detail page to display the student's module progress.
*   **Fetch Progress List:**
    *   Create a new TanStack Query hook (e.g., `useAdminStudentProgressListQuery(studentId)`) that calls the new **Backend Endpoint A** (`GET /api/v1/progress/admin/student/{studentId}`).
    *   Use this hook in the `AdminStudentDetailPage` to fetch the list of `StudentProgressSchema` records for the current student.
*   **Display Progress Summary:**
    *   Render the fetched progress list (e.g., in a table or list format within the new component/section).
    *   For each `StudentProgressSchema` record, display key information like:
        *   Module Title (requires fetching module details or having title in progress record if possible)
        *   Completion Status (`completed` field)
        *   Current Score (`score` field, display 'N/A' if null)
        *   Indication if **Admin** feedback exists (`teacherFeedback` field is not null/empty)
        *   Make each module entry clickable to view details.

**2. Detailed Progress View (Modal or Accordion):**

*   **Trigger:** When an admin clicks on a specific module in the progress overview.
*   **Fetch Detailed Data:**
    *   Create a new TanStack Query hook (e.g., `useAdminStudentModuleDetailQuery(studentId, moduleId)`) that calls the new **Backend Endpoint B** (`GET /api/v1/progress/admin/student/{studentId}/module/{moduleId}`).
    *   Trigger this query when the admin selects a module.
*   **Display Submissions:**
    *   Render the fetched `submissions` array (`ParagraphSubmissionSchema[]`).
    *   For each submission, display:
        *   `paragraphIndex`
        *   `paragraphSummary`
        *   `cumulativeSummary`
        *   `submittedAt`
*   **Display/Edit Feedback & Score:**
    *   Display the existing **Admin** feedback (`teacherFeedback` field, if any) from the fetched `progress` object (likely in a `Textarea`).
    *   Display the existing `score` (if any) from the `progress` object.
    *   Provide an editable `Textarea` for the admin to input or modify the feedback.
    *   Provide an optional input (e.g., number input, slider 0-100) for the admin to set or modify the `score`.
    *   Display the feedback timestamp (`teacherFeedbackAt`) if feedback exists.
*   **Save Feedback/Score:**
    *   Add a "Save Feedback & Score" button.
    *   Create a mutation hook (e.g., `useAdminUpdateProgressMutation`) that calls the **existing Backend Endpoint** `PATCH /api/v1/progress/admin/update/{progressId}`.
    *   The mutation should send the `teacherFeedback` (if changed) and/or `score` (if changed) in the request body.
    *   On successful mutation, invalidate relevant queries (e.g., the detailed view query and potentially the progress list query) to show updated data.

**3. UI/UX Considerations:**

*   Use loading skeletons while fetching progress lists and details.
*   Handle error states gracefully.
*   Clearly distinguish between student submissions and admin feedback/scores.
*   Make the feedback input process intuitive. 