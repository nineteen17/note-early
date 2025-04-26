import { pgTable, uuid, varchar, timestamp, text, integer, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql, type InferModel } from 'drizzle-orm';
import { profiles } from './profiles';
import { studentProgress } from './student-progress';
import { ReadingLevel, ModuleType, Genre, Language, Paragraph } from '@shared/types';

// Reading module type enum
export const moduleTypeEnum = pgEnum('module_type', ['curated', 'custom']);

// --- NEW: Genre Enum ---
export const genreEnum = pgEnum('genre', ['History', 'Adventure', 'Science', 'Non-Fiction', 'Fantasy', 'Biography', 'Mystery', 'Science-Fiction', 'Folktale', 'Custom']);

// --- NEW: Language Enum ---
export const languageEnum = pgEnum('language', ['UK', 'US']);

// Reading Level Enum (using integer column as pgEnum typically requires strings)
// export const readingLevelEnum = pgEnum('reading_level', [...]); // Cannot directly use numeric ReadingLevel enum

// Define reading module schema type
export type ReadingModule = InferModel<typeof readingModules>;

// Reading modules table
export const readingModules = pgTable('reading_modules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  structuredContent: jsonb('structured_content').$type<Paragraph[]>().notNull(),
  paragraphCount: integer('paragraph_count').notNull(),
  level: integer('level').$type<ReadingLevel>().notNull(),
  type: varchar('type', { length: 50 }).$type<ModuleType>().notNull(),
  genre: varchar('genre', { length: 50 }).$type<Genre>().notNull(),
  language: varchar('language', { length: 10 }).$type<Language>().notNull(),
  
  // Only for custom modules
  adminId: uuid('admin_id').references(() => profiles.id, { onDelete: 'set null' }),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  
  // Optional fields
  description: text('description'),
  imageUrl: varchar('image_url', { length: 2048 }),
  estimatedReadingTime: integer('estimated_reading_time'), // in minutes
  
  // --- NEW AUTHOR FIELDS --- 
  authorFirstName: varchar('author_first_name', { length: 100 }), // Optional (nullable by default)
  authorLastName: varchar('author_last_name', { length: 100 }),  // Optional (nullable by default)
  // --- END NEW AUTHOR FIELDS ---
});

// Define relationships
export const readingModulesRelations = relations(readingModules, ({ one, many }) => ({
  // Relation to admin who created the custom module
  admin: one(profiles, {
    fields: [readingModules.adminId],
    references: [profiles.id],
    relationName: 'moduleAdmin'
  }),
  
  // Relation to student progress records for this module
  progress: many(studentProgress, {
    relationName: 'moduleProgress'
  }),
})); 