import { z } from 'zod';

// Define shared enum-like arrays for validation
export const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const; // Use const assertion
export const genreOptions = ["History", "Adventure", "Science", "Non-Fiction", "Fantasy", "Biography", "Mystery", "Science-Fiction", "Folktale", "Custom"] as const;
export const languageOptions = ["UK", "US"] as const;

// Schema for a single paragraph in structured content
const structuredContentItemSchema = z.object({
    index: z.number().int().positive('Index must be a positive integer'),
    text: z.string().min(1, 'Paragraph text cannot be empty'),
});

// Schema for creating a new reading module (aligned with AdminCreateModule form)
export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(), // Allow null for optional text
  level: z.number().refine(val => levelOptions.includes(val as typeof levelOptions[number]), {
      message: `Level must be one of ${levelOptions.join(', ')}`,
  }),
  genre: z.enum(genreOptions), // Use Zod enum for validation
  language: z.enum(languageOptions), // Use Zod enum for validation
  imageUrl: z.string().url('Must be a valid URL').optional().nullable(), // Allow null
  // Rename and keep logic for optional positive integer
  estimatedReadingTime: z.preprocess(
    (val) => (val === '' || val == null || isNaN(Number(val)) ? undefined : Number(val)),
    z.number().int().positive('Est. reading time must be a positive integer').optional().nullable() // Allow null
  ),
  isActive: z.boolean(),
  structuredContent: z.array(structuredContentItemSchema).min(1, 'Module must have at least one paragraph'),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

// Schema for updating an existing reading module (all fields optional, matching create schema)
export const updateModuleSchema = z.object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    description: z.string().optional().nullable(),
    level: z.number().refine(val => levelOptions.includes(val as typeof levelOptions[number]), {
        message: `Level must be one of ${levelOptions.join(', ')}`,
    }).optional(),
    genre: z.enum(genreOptions).optional(),
    language: z.enum(languageOptions).optional(),
    imageUrl: z.string().url('Must be a valid URL').optional().nullable(),
    estimatedReadingTime: z.preprocess(
        (val) => (val === '' || val == null || isNaN(Number(val)) ? undefined : Number(val)),
        z.number().int().positive('Est. reading time must be a positive integer').optional().nullable()
    ),
    isActive: z.boolean().optional(),
    structuredContent: z.array(structuredContentItemSchema).min(1, 'Module must have at least one paragraph').optional(),
});

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

// Schema representing the full Reading Module object returned by the API
export const readingModuleSchema = createModuleSchema.extend({
    id: z.string().uuid(), // Assuming UUID for the ID
    createdAt: z.string().datetime(), // Or z.date()
    updatedAt: z.string().datetime(), // Or z.date()
    createdBy: z.string().optional().nullable(), // Assuming these might be present
    updatedBy: z.string().optional().nullable(), // Assuming these might be present
    paragraphCount: z.number().int().positive('Paragraph count must be a positive integer'),
    type: z.enum(['curated', 'custom']),
    adminId: z.string().uuid().nullable().optional(),
    authorFirstName: z.string().nullable().optional(), // Author fields
    authorLastName: z.string().nullable().optional(), // Author fields
});

export type ReadingModule = z.infer<typeof readingModuleSchema>; 