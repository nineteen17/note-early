import { pgTable, uuid, integer, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { studentProgress } from './student-progress';
export const paragraphSubmissions = pgTable('paragraph_submissions', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    studentProgressId: uuid('student_progress_id')
        .notNull()
        .references(() => studentProgress.id, { onDelete: 'cascade' }), // Cascade delete if progress record is deleted
    paragraphIndex: integer('paragraph_index').notNull(),
    paragraphSummary: text('paragraph_summary').notNull(),
    cumulativeSummary: text('cumulative_summary').notNull(),
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    progressIndex: uniqueIndex('progress_paragraph_idx').on(table.studentProgressId, table.paragraphIndex),
}));
// Define relationships
export const paragraphSubmissionsRelations = relations(paragraphSubmissions, ({ one }) => ({
    // Relation back to the overall student progress record
    studentProgress: one(studentProgress, {
        fields: [paragraphSubmissions.studentProgressId],
        references: [studentProgress.id],
    }),
}));
