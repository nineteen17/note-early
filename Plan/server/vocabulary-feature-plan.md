# Vocabulary Feature Implementation Plan

**Goal:** Implement a vocabulary feature where admins can define words and descriptions for specific paragraphs within reading modules. Students can then view these definitions.

**Chosen Approach:** Create a new `vocabulary` table linked to `reading_modules`.

---

**Phase 1: Database Schema & Types**

1.  **Create Vocabulary Schema (`server/src/db/schema/vocabulary.ts` - New File):**

    - **Action:** Define the `vocabulary` table using Drizzle.
    - **Content:**

      ```typescript
      import {
        pgTable,
        uuid,
        integer,
        varchar,
        text,
        timestamp,
        uniqueIndex,
      } from "drizzle-orm/pg-core";
      import { relations, sql } from "drizzle-orm";
      import { readingModules } from "./reading-modules";

      export const vocabulary = pgTable(
        "vocabulary",
        {
          id: uuid("id")
            .primaryKey()
            .default(sql`gen_random_uuid()`),
          moduleId: uuid("module_id")
            .notNull()
            .references(() => readingModules.id, { onDelete: "cascade" }), // Crucial: Cascade delete
          paragraphIndex: integer("paragraph_index").notNull(), // 1-based index
          word: varchar("word", { length: 100 }).notNull(), // Word being defined
          description: text("description").notNull(), // Definition
          createdAt: timestamp("created_at").notNull().defaultNow(),
          updatedAt: timestamp("updated_at").notNull().defaultNow(),
        },
        (table) => ({
          // Optional but recommended: Unique constraint
          moduleParagraphWordIdx: uniqueIndex("module_paragraph_word_idx").on(
            table.moduleId,
            table.paragraphIndex,
            table.word
          ),
        })
      );

      // Relationships
      export const vocabularyRelations = relations(vocabulary, ({ one }) => ({
        module: one(readingModules, {
          fields: [vocabulary.moduleId],
          references: [readingModules.id],
        }),
      }));
      ```

2.  **Update Schema Index (`server/src/db/schema/index.ts`):**

    - **Action:** Import and re-export the `vocabulary` table and `vocabularyRelations`. Add a `Vocabulary` type alias.
    - **Changes:**

      ```diff
      // ... other imports
      + import { vocabulary, vocabularyRelations } from './vocabulary';

      // ... other exports
      + export { vocabulary, vocabularyRelations };

      // ... other type exports
      + export type Vocabulary = typeof vocabulary.$inferSelect;
      + export type NewVocabulary = typeof vocabulary.$inferInsert;

      // Add to relations export if you have a central one
      export const schema = {
          // ... existing schemas
      +   vocabulary,
      };
      export const relations = {
          // ... existing relations
      +   vocabularyRelations,
      };
      ```

3.  **Update Shared Types (`server/src/shared/types/index.ts`):**

    - **Action:** Define a shared DTO type for vocabulary entries.
    - **Changes:**

      ```typescript
      // ... other types ...

      + // Vocabulary Entry Type
      + export interface VocabularyEntry {
      +  id: string;
      +  moduleId: string;
      +  paragraphIndex: number;
      +  word: string;
      +  description: string;
      +  // Optionally include createdAt/updatedAt if needed by frontend
      + }

      // ... rest of the file ...
      ```

---

**Phase 2: Backend API (Reading Modules Module)**

4.  **Modify Reading Module Service (`server/src/modules/reading-modules/services/reading.service.ts`):**

    - **Action:** Add new methods for managing vocabulary. Inject `db` if not already done consistently.
    - **New Methods:**
      - `async createVocabularyEntry(moduleId: string, data: NewVocabularyInput): Promise<Vocabulary>`: Validates `paragraphIndex` against module's `paragraphCount`, checks permissions (if needed, maybe controller responsibility), inserts into `vocabulary` table.
      - `async updateVocabularyEntry(vocabularyId: string, userId: string, updates: Partial<NewVocabularyInput>): Promise<Vocabulary>`: Fetches entry, verifies module ownership via `userId`, updates the entry.
      - `async deleteVocabularyEntry(vocabularyId: string, userId: string): Promise<void>`: Fetches entry, verifies module ownership via `userId`, deletes the entry.
      - `async getVocabularyForModule(moduleId: string): Promise<Vocabulary[]>`: Fetches all vocabulary for a given module ID.
      - `async getVocabularyForParagraph(moduleId: string, paragraphIndex: number): Promise<Vocabulary[]>`: Fetches vocabulary filtered by module ID and paragraph index.
    - **Helper Type (`NewVocabularyInput`)**: Define an interface/type for the input data (`paragraphIndex`, `word`, `description`).

5.  **Modify Reading Module Controller (`server/src/modules/reading-modules/controllers/reading.controller.ts`):**

    - **Action:** Add new Zod schemas for validation and new controller methods to handle API requests.
    - **New Zod Schemas:**
      - `VocabularyIdParamSchema = z.object({ vocabularyId: z.string().uuid() });`
      - `VocabularyBodySchema = z.object({ paragraphIndex: z.number().int().positive(), word: z.string().min(1).max(100), description: z.string().min(1).max(1000) });` (Adjust max limits as needed).
      - `UpdateVocabularyBodySchema = VocabularyBodySchema.partial().refine(...)`;
      - `GetVocabularyForParagraphParamsSchema = z.object({ moduleId: z.string().uuid(), paragraphIndex: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0) });`
    - **New Controller Methods:**
      - `createVocabularyEntry(req, res, next)`: Use `moduleId` from params, parse body with `VocabularyBodySchema`, call `readingModuleService.createVocabularyEntry`. Needs admin auth middleware.
      - `updateVocabularyEntry(req, res, next)`: Use `vocabularyId` from params, parse body with `UpdateVocabularyBodySchema`, get `userId` from `req.user`, call `readingModuleService.updateVocabularyEntry`. Needs admin auth middleware.
      - `deleteVocabularyEntry(req, res, next)`: Use `vocabularyId` from params, get `userId` from `req.user`, call `readingModuleService.deleteVocabularyEntry`. Needs admin auth middleware.
      - `getModuleVocabulary(req, res, next)`: Use `moduleId` from params, call `readingModuleService.getVocabularyForModule`. Needs admin auth middleware.
      - `getParagraphVocabulary(req, res, next)`: Parse params with `GetVocabularyForParagraphParamsSchema`, call `readingModuleService.getVocabularyForParagraph`. **Publicly accessible.**
    - **DTO Mapping:** Create `mapToVocabularyEntryDTO` if needed to align DB results with the shared `VocabularyEntry` type.

6.  **Modify Reading Module Routes (`server/src/modules/reading-modules/routes/reading.routes.ts`):**
    - **Action:** Define new routes and link them to the controller methods, applying appropriate middleware.
    - **New Routes:**
      - `POST /api/v1/reading-modules/:moduleId/vocabulary` (Admin Auth) -> `createVocabularyEntry`
      - `PUT /api/v1/vocabulary/:vocabularyId` (Admin Auth) -> `updateVocabularyEntry`
      - `DELETE /api/v1/vocabulary/:vocabularyId` (Admin Auth) -> `deleteVocabularyEntry`
      - `GET /api/v1/reading-modules/:moduleId/vocabulary` (Admin Auth) -> `getModuleVocabulary`
      - `GET /api/v1/reading-modules/:moduleId/paragraphs/:paragraphIndex/vocabulary` (Public) -> `getParagraphVocabulary`

---

**Phase 3: Testing**

7.  **Analyze Existing Tests (`server/src/modules/reading-modules/__tests__/reading.service.test.ts`):**

    - **Predicted Failures:**
      - Tests involving deleting a reading module might fail if they don't account for the cascaded deletion of vocabulary entries or if mocking needs adjustment.
      - Tests checking the exact structure of a fetched module might fail if the test setup doesn't account for the (now possible) lack of vocabulary relations.
    - **Action:** Review this test file. Adjust mocks (e.g., for `db.delete`, `db.query.readingModules.findFirst`) to handle the new `vocabulary` table interactions or relations if necessary. Ensure deletion tests implicitly cover the cascade or add an explicit check.

8.  **Write New Tests (`server/src/modules/reading-modules/__tests__/reading.service.test.ts` or New File):**

    - **Action:** Add comprehensive tests for the new vocabulary service methods.
    - **Test Cases:**
      - `createVocabularyEntry`: Success case, error if `paragraphIndex` is out of bounds, error on duplicate (`module_paragraph_word_idx`), error if module doesn't exist.
      - `updateVocabularyEntry`: Success case, error if entry not found, error if user doesn't own the module.
      - `deleteVocabularyEntry`: Success case, error if entry not found, error if user doesn't own the module.
      - `getVocabularyForModule`: Success case (returns multiple entries), success case (returns empty array).
      - `getVocabularyForParagraph`: Success case (returns filtered entries), success case (returns empty array).
      - **Cascade Delete Test:** Create a module, add vocabulary, delete the module, verify vocabulary is gone. (This might be more of an integration test).

9.  **Write New API/Integration Tests (e.g., using Supertest in existing route test files):**
    - **Action:** Test the new API endpoints.
    - **Test Cases:**
      - Test `POST`, `PUT`, `DELETE` endpoints with valid/invalid input, correct/incorrect authentication.
      - Test `GET` endpoints (both admin and public) for correct data retrieval and filtering.
      - Verify Zod validation errors and responses (400 Bad Request).
      - Verify authentication/authorization responses (401 Unauthorized, 403 Forbidden).

---

**Execution Order:**

1.  Implement Database changes (Schema, Index, Migration).
2.  Implement Shared Types.
3.  Implement Service methods.
4.  Write Service tests.
5.  Implement Controller methods & Zod schemas.
6.  Implement Routes.
7.  Write API/Integration tests.
8.  Adjust existing tests.
9.  Run _all_ tests.

---

**Questions/Uncertainties:**

- **Permission Model:** The plan assumes the service methods for update/delete receive `userId` to check ownership against the module's `adminId`. Is this correct, or is permission handled purely by middleware? (Assuming service check for thoroughness).
- **Zod Limits:** Proposed limits for `word` (100) and `description` (1000) seem reasonable, but confirm if these are appropriate.
