import { z } from 'zod';

// Based on ProfileUpdateRequest schema from Swagger/API spec
export const profileUpdateSchema = z.object({
  // Using optional() as PATCH might only send fields to update
  fullName: z.string()
             .min(2, { message: "Full name must be at least 2 characters." })
             .optional(),
  avatarUrl: z.string()
              .url({ message: "Invalid URL format." })
              .nullable()
              .optional(), // Allow null or omission 
  // Add other updatable fields from ProfileDTO if applicable later (e.g., age for students)
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Based on POST /auth/reset-password request body
export const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required."}),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters."}),
  confirmNewPassword: z.string().min(8, { message: "Please confirm your new password."}),
})
// Add a refinement to check if newPassword and confirmNewPassword match
.refine(data => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"], // Attach the error to the confirmation field
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// We can add other profile-related schemas here (e.g., password reset) 