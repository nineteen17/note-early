# Iterative Summarization Implementation Plan

## 1. Goal

To refactor the application's data structures and backend logic to support the core functionality: allowing students to read content paragraph by paragraph and submit both individual paragraph summaries and cumulative summaries iteratively.

## 2. Problem with Current Implementation

- `reading_modules.content` is a single `text` field, making it difficult to segment content into paragraphs for processing and display.
- `student_progress` only tracks overall module completion and stores a single `summaryText`, which cannot accommodate paragraph-level summaries or iterative cumulative summaries.

## 3. Proposed New Implementation Overview

- **Reading Modules:** Content will be stored as structured JSON (an array of paragraphs) within the `reading_modules` table.
- **Paragraph Submissions:** A new dedicated table (`paragraph_submissions`) will store each summary submitted by a student for a specific paragraph, including both the individual paragraph summary and the cumulative summary up to that point.
- **Student Progress:** The existing `student_progress` table will be modified to track the overall module status, the highest paragraph index reached by the student, and the final cumulative summary submitted after completing the last paragraph.

## 4. Detailed Schema Changes (The "What")

### 4.1. `reading_modules` Table (`server/src/db/schema/reading-modules.ts`)

- **Modify `content` Column:**
  - Change type from `text` to `jsonb`.
  - Rename to `structuredContent` (optional, but clearer).
  - Expected JSON Structure: `[{ "index": number, "text": string }, ...]` where `index` is a 1-based paragraph number.
- **Add `paragraphCount` Column:**
  - Name: `paragraphCount`
  - Type: `integer`
  - Constraint: `NOT NULL`, potentially `DEFAULT 0` or calculated on insert/update.

### 4.2. New `paragraph_submissions` Table (`server/src/db/schema/paragraph-submissions.ts`)

- **Columns:**
  - `id`: `uuid` (Primary Key, default `gen_random_uuid()`)
  - `studentProgressId`: `uuid` (Foreign Key -> `student_progress.id`, `NOT NULL`)
  - `paragraphIndex`: `integer` (`NOT NULL`)
  - `paragraphSummary`: `text` (`NOT NULL`)
  - `cumulativeSummary`: `text` (`NOT NULL`)
  - `submittedAt`: `timestamp` (`NOT NULL`, default `now()`)
- **Indexes:** Consider an index on `(studentProgressId, paragraphIndex)` for efficient lookups.

### 4.3. `student_progress` Table (`server/src/db/schema/student-progress.ts`)

- **Remove `summaryText` Column:** This field is replaced by entries in `paragraph_submissions`.
- **Add `highestParagraphIndexReached` Column:**
  - Name: `highestParagraphIndexReached`
  - Type: `integer`
  - Constraint: `NULLABLE` (or default 0)
- **Add `finalSummary` Column:**
  - Name: `finalSummary`
  - Type: `text`
  - Constraint: `NULLABLE`

## 5. Implementation Details by Layer (The "How")

### 5.1. Database Layer (Schema Files & Migrations)

1.  **Modify Schema Files:**
    - Update `reading-modules.ts` as described in section 4.1.
    - Create `paragraph-submissions.ts` as described in section 4.2.
    - Update `student-progress.ts` as described in section 4.3.
    - Ensure relationships are correctly defined in all relevant schema files.
2.  **Generate Migrations:** Run `npx drizzle-kit generate`.
3.  **Manually Edit Migration SQL:**
    - The automatically generated SQL for changing `content` from `text` to `jsonb` might fail or require adjustment. It will likely need a `USING content::jsonb` clause. Careful review and potential manual editing of the migration file are necessary.
    - Ensure the creation of `paragraph_submissions` and its foreign key happens _after_ `student_progress` exists.
    - Ensure modifications to `student_progress` (removing column, adding columns) are correctly ordered.
4.  **Apply Migrations:** Run `npx drizzle-kit migrate` after editing.
5.  **Data Migration (If Applicable):** If existing `reading_modules` data exists, write a script to parse the `content` text into the new `jsonb` structure and populate `paragraphCount`. This is complex and depends on how reliably paragraphs can be identified in the existing text.

### 5.2. Backend Service Layer (`ReadingModuleService`, `ProgressService`, etc.)

1.  **`ReadingModuleService` (`reading.service.ts`):**
    - Modify `createModule` and `updateModule` to handle the `structuredContent` (validating the JSON structure) and calculate/store `paragraphCount`.
    - Potentially add a new method `getModuleParagraph(moduleId: string, paragraphIndex: number)` to fetch the text of a specific paragraph from the `structuredContent` JSON.
    - Update methods returning modules (`getModuleById`, `getActiveModules`, etc.) to potentially include `paragraphCount` and handle the `structuredContent` field.
2.  **`ProgressService` (`progress.service.ts`):**
    - **Remove/Modify `updateProgress`:** The existing method is likely insufficient.
    - **Add `submitParagraphSummary`:**
      - Accepts `studentId`, `moduleId`, `paragraphIndex`, `paragraphSummary`, `cumulativeSummary`.
      - Finds or creates the corresponding `student_progress` record (mark `startedAt` if new).
      - Inserts a new record into `paragraph_submissions`.
      - Updates `student_progress.highestParagraphIndexReached` if `paragraphIndex` is higher than the current value.
      - Checks if `paragraphIndex` equals `reading_modules.paragraphCount`.
        - If yes, updates `student_progress.completed` to `true`, sets `completedAt`, and saves the `cumulativeSummary` into `student_progress.finalSummary`.
    - **Add `getStudentProgressDetails` (or similar):**
      - Fetches the main `student_progress` record.
      - Fetches all associated `paragraph_submissions` records, ordered by `paragraphIndex`.
      - Returns a combined structure useful for the frontend (e.g., overall status, highest index reached, list of submitted summaries).
    - Modify existing methods (`getStudentProgress`, `getModuleProgress`) as needed to align with the new structure or deprecate them if replaced by `getStudentProgressDetails`.

### 5.3. Backend Controller Layer (`reading.controller.ts`, `progress.controller.ts`)

1.  **Modify `ReadingModuleController`:**
    - Update `createReadingModule` and `updateReadingModule` to handle the new `structuredContent` format in requests (or adapt to only accept plain text and structure it in the service).
    - Potentially add `getModuleParagraph(moduleId, paragraphIndex)` endpoint handler.
2.  **Modify `ProgressController`:**
    - Add `submitParagraphSummary` endpoint handler, validating input and calling the service method.
    - Add `getStudentProgressDetails` endpoint handler.
    - Update or remove handlers corresponding to deprecated service methods.

### 5.4. Backend API Route Layer (`reading.routes.ts`, `progress.routes.ts`)

1.  **Define New Routes:**
    - `POST /api/v1/progress/submit-summary`: For submitting paragraph/cumulative summaries.
    - `GET /api/v1/progress/details/{moduleId}`: For fetching detailed progress including paragraph summaries for the logged-in student for a specific module.
    - `GET /api/v1/reading-modules/{moduleId}/paragraph/{paragraphIndex}`: (Optional) For fetching a specific paragraph's text.
2.  **Modify Existing Routes:** Update request/response formats for module creation/update if `structuredContent` is passed directly.

### 5.5. Zod Validation Layer (`*.schema.ts`)

1.  **Create `progress.schema.ts` (if not already done):**
    - Define `submitSummarySchema`: validates `moduleId` (uuid), `paragraphIndex` (integer > 0), `paragraphSummary` (string, non-empty), `cumulativeSummary` (string, non-empty).
2.  **Modify `reading.schema.ts` (or controller):**
    - Update `CreateModuleSchema` and `UpdateModuleSchema` if they need to handle `structuredContent` (e.g., using `z.array(z.object({ index: z.number(), text: z.string() }))`) and `paragraphCount`.

### 5.6. Swagger Documentation Layer (`swagger.zod.ts`, `*.routes.ts`)

1.  **Register New Schemas:** Add new Zod schemas (e.g., `SubmitSummaryInput`) to the registry in `swagger.zod.ts`.
2.  **Define DTOs:** Define necessary response DTOs (e.g., `ProgressDetailsDTO`, `ParagraphSubmissionDTO`) in `swagger.zod.ts` under `manualSchemas` or generate from Zod if possible.
3.  **Update Route Docs:**
    - Add JSDoc comments for new routes (`/progress/submit-summary`, `/progress/details/{moduleId}`, etc.).
    - Update JSDoc for modified routes (module create/update) to reflect new request/response bodies and schema references.
    - Ensure all schema references (`$ref`) point to the correct definitions.

### 5.7. Testing Layer (`*.test.ts`)

1.  **Update Existing Tests:** Modify unit/integration tests for `ReadingModuleService`, `ProgressService`, and their controllers/routes to reflect the schema changes and new logic.
    Mocks (e.g., Drizzle mocks) will need significant updates.
2.  **Write New Tests:** Create tests for:
    - New service methods (`submitParagraphSummary`, `getStudentProgressDetails`, `getModuleParagraph`).
    - New API endpoints.
    - Correct handling of paragraph indexing, cumulative summaries, and final module completion logic.
    - Validation of structured content and summary submissions.

### 5.8. Frontend Layer (Conceptual)

1.  **Reading View:** Fetch module data. Display content paragraph by paragraph based on `structuredContent` and current progress (`highestParagraphIndexReached`).
2.  **Summary Input:** Provide input fields for _both_ the individual paragraph summary and the cumulative summary after each paragraph is read.
3.  **State Management:** Track the current paragraph index, submitted summaries, etc.
4.  **API Calls:**
    - Call `GET /api/v1/progress/details/{moduleId}` to load initial state or resume progress.
    - Call `POST /api/v1/progress/submit-summary` after each paragraph summarization step.
    - Handle loading states and errors.

## 6. Summary Checklist

- [x] Modify `reading_modules` schema (content -> jsonb, add paragraphCount)
- [x] Create `paragraph_submissions` schema
- [x] Modify `student_progress` schema (remove summaryText, add fields)
- [x] Define relationships for new table
- [x] Generate Drizzle migrations
- [x] Manually review and edit migration SQL (esp. for jsonb cast)
- [x] Apply migrations
- [x] Implement data migration script (if needed)
- [x] Update `ReadingModuleService` (content handling, getParagraph)
- [x] Update/Create `ProgressService` methods (submitSummary, getDetails)
- [x] Update/Create `ReadingModuleController` handlers
- [x] Update/Create `ProgressController` handlers
- [x] Define/Modify API routes
- [x] Define/Modify Zod validation schemas
- [x] Update Swagger configuration and route documentation
- [x] Update/Write unit and integration tests
- [ ] Implement frontend changes (display, input, API calls, state)

## 7. Potential Challenges

- Reliably parsing existing `content` text into structured JSON if data migration is needed.
- Handling potentially large JSON payloads for `structuredContent`.
- Complexity in frontend state management for the iterative process.
- Ensuring correct calculation and storage of cumulative summaries.
- Thorough testing of the entire workflow.
