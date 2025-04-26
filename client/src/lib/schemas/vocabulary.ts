import { z } from 'zod';

// Schema for the vocabulary form (used for both add and edit)
export const vocabularyFormSchema = z.object({
    paragraphIndex: z.number({
        required_error: "Paragraph index is required.",
        invalid_type_error: "Paragraph index must be a number.",
    }).min(1, "Paragraph index must be at least 1."),
    word: z.string({
        required_error: "Word is required.",
    }).min(1, "Word cannot be empty.").max(100, "Word cannot exceed 100 characters."),
    description: z.string({
        required_error: "Description is required.",
    }).min(1, "Description cannot be empty.").max(1000, "Description cannot exceed 1000 characters."),
});

// Infer the type from the schema
export type VocabularyFormInput = z.infer<typeof vocabularyFormSchema>; 