# Reading Module Author Feature Implementation Plan

**Goal:** Add optional `authorFirstName` and `authorLastName` fields to reading modules to allow attribution for module creators (e.g., "NoteEarly", teachers, external professionals).

---

**Phase 1: Database Schema & Types**

1.  **Modify Reading Module Schema (`server/src/db/schema/reading-modules.ts`):**

    - **Action:** Add two new nullable `varchar` columns to the `readingModules` table definition.
    - **Changes:**

      ```diff
      // ... other imports
      import {
        pgTable,
        uuid,
        varchar,
        text,
        integer,
        boolean,
        jsonb,
        timestamp,
      } from "drizzle-orm/pg-core";
      import { relations, sql } from "drizzle-orm";
      import { ReadingLevel, ModuleType, Genre, Language, Paragraph } from "@shared/types";
      import { profiles } from "./profiles";

      export const readingModules = pgTable("reading_modules", {
        // ... existing columns (id, title, etc.) ...
        genre: varchar("genre", { length: 50 }).$type<Genre>().notNull(),
        language: varchar("language", { length: 10 }).$type<Language>().notNull(),
        adminId: uuid("admin_id").references(() => profiles.id, { onDelete: "set null" }), // Changed from set null? Check original intent
        description: text("description"),
        imageUrl: varchar("image_url", { length: 2048 }),
        estimatedReadingTime: integer("estimated_reading_time"), // In minutes
        isActive: boolean("is_active").notNull().default(true),
      + authorFirstName: varchar("author_first_name", { length: 100 }), // Optional
      + authorLastName: varchar("author_last_name", { length: 100 }),  // Optional
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
      });

      // ... existing relations ...
      ```

2.  **Update Schema Index (`server/src/db/schema/index.ts`):**

    - **Action:** No direct changes needed here unless you manually re-export types. Drizzle's `$inferSelect` (`ReadingModule`) and `$inferInsert` (`NewReadingModule`) will automatically include the new fields. Ensure downstream code imports these updated types correctly if not already doing so.

3.  **Update Shared Types (`server/src/shared/types/index.ts`):**

    - **Action:** Decide if author names should be exposed to the client. If yes, add optional fields to the `ReadingModuleDTO`.
    - **Changes (if exposing to client):**

      ```typescript
      // ... other types ...

      // Reading Module DTO
      export interface ReadingModuleDTO {
        id: string;
        // ... other existing DTO fields ...
        language: Language;
      + authorFirstName?: string | null; // Optional
      + authorLastName?: string | null;  // Optional
        createdAt: string; // Assuming string format for DTO
        // ... rest of DTO fields ...
      }

      // ... rest of the file ...
      ```

---

**Phase 2: Backend API (Reading Modules Module)**

4.  **Modify Reading Module Service (`server/src/modules/reading-modules/services/reading.service.ts`):**

    - **Action:** Update input types and service methods to handle optional author fields.
    - **Input Types:**
      - Modify `CreateModuleInput` and `UpdateModuleInput` interfaces to include `authorFirstName?: string | null;` and `authorLastName?: string | null;`.
    - **Methods:**
      - `createModule`: Update the `.values({...})` call in the `db.insert` operation to include `authorFirstName: input.authorFirstName, authorLastName: input.authorLastName` if provided in the input.
      - `updateModule` / `superAdminUpdateModule`: Update the `.set({...})` call in the `db.update` operation to include `authorFirstName: updates.authorFirstName, authorLastName: updates.authorLastName` _only if_ these fields are present in the `updates` object (to allow setting them to null or updating them).

5.  **Modify Reading Module Controller (`server/src/modules/reading-modules/controllers/reading.controller.ts`):**

    - **Action:** Update Zod validation schemas to include the new optional fields.
    - **Zod Schemas:**
      - Modify the Zod schemas used for creating and updating modules (e.g., `CreateModuleSchema`, `UpdateModuleSchema`). Add validation for `authorFirstName` and `authorLastName` as optional strings:
        ```typescript
        // Example addition to a schema
        authorFirstName: z.string().min(1).max(100).optional().nullable(),
        authorLastName: z.string().min(1).max(100).optional().nullable(),
        ```
    - **Controller Methods:** No significant logic changes expected. Ensure the validated data, including the optional author fields, is passed correctly to the service layer methods.
    - **DTO Mapping:** If the `ReadingModuleDTO` was updated, ensure any mapping function (e.g., `mapToReadingModuleDTO`) correctly includes the new optional author fields.

6.  **Modify Reading Module Routes (`server/src/modules/reading-modules/routes/reading.routes.ts`):**
    - **Action:** No functional route changes needed. Documentation updates will be handled in Phase 4.

---

**Phase 3: Testing**

7.  **Adjust Existing Service Tests (`server/src/modules/reading-modules/__tests__/reading.service.test.ts`):**

    - **Action:** Modify existing tests for `createModule`, `updateModule`, and `superAdminUpdateModule`.
    - **Changes:**
      - Update mock data objects (e.g., `mockReadingModule`, inputs for create/update) to potentially include `authorFirstName` and `authorLastName`.
      - Adjust assertions (`expect(...).toHaveBeenCalledWith(...)`) for `db.insert` and `db.update` calls to correctly check for the presence or absence of the new author fields in the `.values()` or `.set()` arguments.
      - Ensure test cases cover scenarios where author names _are_ provided and where they _are not_ provided (remain null).

8.  **Write New Service Tests:**
    - **Action:** No fundamentally new test suites are required solely for these optional fields, but ensure coverage within the adjusted existing tests is sufficient.

---

**Phase 4: Documentation**

9.  **Update Swagger Documentation:**
    - **JSDoc (`server/src/modules/reading-modules/routes/reading.routes.ts`):**
      - Update the `@swagger` comments for the `ReadingModuleDTO` schema definition (if modified in Phase 1).
      - Update the `@swagger` comments for the `CreateModuleInput` and `UpdateModuleInput` schema definitions. Add the optional `authorFirstName` and `authorLastName` properties with descriptions.
    - **JSON (`Plan/client/NoteEarly-swagger-2.json`):**
      - Manually edit the JSON file to mirror the JSDoc changes. Update the corresponding schema definitions (`ReadingModuleDTO`, `CreateModuleInput`, `UpdateModuleInput`) to include the new optional properties.

---

**Execution Order:**

1.  Modify Database Schema (`reading-modules.ts`).
2.  Generate & Run Migration.
3.  Update Shared Types (`shared/types/index.ts`) (if exposing to DTO).
4.  Modify Service Input Types & Methods (`reading.service.ts`).
5.  Modify Controller Zod Schemas & DTO Mapping (`reading.controller.ts`).
6.  Adjust Service Tests (`reading.service.test.ts`).
7.  Run Service Tests.
8.  Update Swagger JSDoc (`reading.routes.ts`).
9.  Manually Update Swagger JSON (`Plan/client/NoteEarly-swagger-2.json`).

---

**Questions/Uncertainties:**

- Confirm character limits (e.g., 100) are appropriate for names.
- Should `authorFirstName` and `authorLastName` definitely be included in the `ReadingModuleDTO` sent to clients? (Assumed yes for this plan).
- Any specific logic desired if a module type is 'curated' but no author is provided? (Current plan assumes it simply remains null).
