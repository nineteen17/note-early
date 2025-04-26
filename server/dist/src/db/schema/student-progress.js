import { pgTable, uuid, timestamp, text, boolean, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { profiles } from './profiles';
import { readingModules } from './reading-modules';
import { paragraphSubmissions } from './paragraph-submissions';
// Student progress table
export const studentProgress = pgTable('student_progress', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    studentId: uuid('student_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    moduleId: uuid('module_id').references(() => readingModules.id, { onDelete: 'cascade' }).notNull(),
    // Progress tracking
    completed: boolean('completed').default(false).notNull(),
    score: integer('score'), // Optional score for comprehension
    highestParagraphIndexReached: integer('highest_paragraph_index_reached'),
    finalSummary: text('final_summary'),
    // Time tracking
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    timeSpentMinutes: integer('time_spent_minutes'),
    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Optional feedback
    teacherFeedback: text('teacher_feedback'),
    teacherFeedbackAt: timestamp('teacher_feedback_at'),
});
// Define relationships
export const studentProgressRelations = relations(studentProgress, ({ one, many }) => ({
    student: one(profiles, {
        fields: [studentProgress.studentId],
        references: [profiles.id],
        relationName: 'progressStudent'
    }),
    module: one(readingModules, {
        fields: [studentProgress.moduleId],
        references: [readingModules.id],
        relationName: 'progressModule'
    }),
    submissions: many(paragraphSubmissions, {
        relationName: 'progressSubmissions'
    }),
}));
