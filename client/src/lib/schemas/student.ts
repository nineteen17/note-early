import { z } from 'zod';

// Schema based on CreateStudentInput in API Spec
// POST /auth/admin/student
export const createStudentSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  pin: z
    .string()
    .length(4, { message: 'PIN must be exactly 4 digits.' })
    .regex(/^\d+$/, { message: 'PIN must only contain digits.' }),
  // Add other fields if necessary based on refined requirements, e.g., age, readingLevel
  // age: z.coerce.number().int().positive().optional(),
  // readingLevel: z.coerce.number().int().min(1).max(10).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// Schema based on AdminUpdateStudentRequest in API Spec
// PATCH /profiles/admin/students/{profileId}
export const updateStudentSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }).optional(),
    avatarUrl: z.string().url({ message: "Please enter a valid URL." }).nullable().optional(),
    // Only include fields that can actually be updated via this endpoint
}).refine(data => Object.keys(data).length > 0, { 
    message: "At least one field must be provided for update."
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

// Schema based on ResetStudentPinInput in API Spec
// POST /auth/admin/student/reset-pin
export const resetStudentPinSchema = z.object({
    // studentId will be passed separately to the mutation hook
    newPin: z
        .string()
        .length(4, { message: 'New PIN must be exactly 4 digits.' })
        .regex(/^\d+$/, { message: 'New PIN must only contain digits.' }),
});

export type ResetStudentPinInput = z.infer<typeof resetStudentPinSchema>;

// TODO: Add schemas for other student operations if needed
// e.g., resetPinSchema 