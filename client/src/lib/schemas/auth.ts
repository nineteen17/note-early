import { z } from 'zod';

// Schema based on AdminLoginInput from Swagger/API spec
export const adminLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  // Using min(1) as per Swagger spec, though min(8) is common practice
  password: z.string().min(1, { message: "Password is required." }),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// Schema based on AdminSignupInput from Swagger/API spec
export const adminSignupSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters."}),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters."}),
});

export type AdminSignupInput = z.infer<typeof adminSignupSchema>;

// Schema based on StudentLoginInput from Swagger/API spec
export const studentLoginSchema = z.object({
    studentId: z.string().uuid({ message: "Invalid Student ID format."}),
    // Ensure PIN is exactly 4 digits
    pin: z.string().length(4, { message: "PIN must be exactly 4 digits."}).regex(/^\d+$/, { message: "PIN must only contain digits."}),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

// We can add other auth-related schemas here later (e.g., reset password) 