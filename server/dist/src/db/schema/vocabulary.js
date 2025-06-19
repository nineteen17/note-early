import { pgTable, uuid, integer, varchar, text, timestamp, uniqueIndex, } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { readingModules } from "./reading-modules.js";
export const vocabulary = pgTable("vocabulary", {
    id: uuid("id")
        .primaryKey()
        .default(sql `gen_random_uuid()`),
    moduleId: uuid("module_id")
        .notNull()
        .references(() => readingModules.id, { onDelete: "cascade" }), // Crucial: Cascade delete
    paragraphIndex: integer("paragraph_index").notNull(), // 1-based index
    word: varchar("word", { length: 100 }).notNull(), // Word being defined
    description: text("description").notNull(), // Definition
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    // Optional but recommended: Unique constraint
    moduleParagraphWordIdx: uniqueIndex("module_paragraph_word_idx").on(table.moduleId, table.paragraphIndex, table.word),
}));
// Relationships
export const vocabularyRelations = relations(vocabulary, ({ one }) => ({
    module: one(readingModules, {
        fields: [vocabulary.moduleId],
        references: [readingModules.id],
    }),
}));
