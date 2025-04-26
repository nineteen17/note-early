import { z } from 'zod';

// Schema for the Admin Update Progress form
export const adminUpdateProgressSchema = z.object({
  score: z.number({
    invalid_type_error: "Score must be a number."
  })
  .min(0, "Score cannot be less than 0.")
  .max(100, "Score cannot be more than 100.")
  .nullable()
  .optional(), // Score is optional, allow null
  teacherFeedback: z.string().nullable().optional(), // Feedback is optional, allow null
  completed: z.boolean({
    required_error: "Completion status is required."
  }),
});

// Infer the type from the schema
export type AdminUpdateProgressFormInput = z.infer<typeof adminUpdateProgressSchema>; 