import { z } from 'zod';

// --- Shared Sub-Schemas ---

// Schema for a single paragraph within structuredContent
const paragraphSchema = z.object({
  index: z.number().int().positive({ message: "Paragraph index must be positive." }),
  text: z.string().min(1, { message: "Paragraph text cannot be empty." }),
});

// --- Enum Definitions (Import or define directly) ---
// Re-defining based on ReadingModuleDTO and CreateModuleInput types in api/index.ts
const moduleLevelSchema = z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
    z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10)
]);

const moduleGenreSchema = z.enum([
    "History", "Adventure", "Science", "Non-Fiction", "Fantasy", 
    "Biography", "Mystery", "Science-Fiction", "Folktale", "Custom"
]);

const moduleLanguageSchema = z.enum(["UK", "US"]);

// --- Main Schemas ---

// Schema based on CreateModuleInput in API Spec
// POST /reading-modules
export const createModuleSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  structuredContent: z.array(paragraphSchema)
    .min(1, { message: "Module must have at least one paragraph." })
    // Add refinement to ensure indices are unique and sequential?
    .refine(paragraphs => {
        const indices = paragraphs.map(p => p.index).sort((a, b) => a - b);
        if (indices.length === 0) return true; // Allow empty array during validation stages?
        // Check for uniqueness
        if (new Set(indices).size !== indices.length) return false;
        // Check for sequential starting from 1
        for (let i = 0; i < indices.length; i++) {
          if (indices[i] !== i + 1) return false;
        }
        return true;
    }, { message: "Paragraph indices must be unique and sequential starting from 1." }),
  level: moduleLevelSchema,
  genre: moduleGenreSchema,
  language: moduleLanguageSchema,
  description: z.string().nullable().optional(), // Nullable and optional
  imageUrl: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().url({ message: "Invalid image URL." }).nullable().optional()
  ),
  estimatedReadingTime: z.coerce // Use coerce for number input from string
    .number()
    .int()
    .positive({ message: "Estimated time must be a positive number." })
    .nullable()
    .optional(),
  isActive: z.boolean().default(true), // Default to active/published
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

// TODO: Add schemas for UpdateModuleInput if different
// Based on the spec, UpdateModuleInput seems identical or perhaps partial
export const updateModuleSchema = createModuleSchema.partial(); // Example if all fields are optional on update
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

// TODO: Add Vocabulary schemas if managed here 