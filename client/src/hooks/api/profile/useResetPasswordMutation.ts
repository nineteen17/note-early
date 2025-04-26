import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { PasswordResetInput } from '@/lib/schemas/profile';
import { toast } from 'sonner';

// Define the mutation function
// Note: The API expects { currentPassword, newPassword }
// The schema includes confirmNewPassword for validation, but we don't send it.
const resetPassword = async (data: PasswordResetInput): Promise<{ message: string }> => {
    const { currentPassword, newPassword } = data;
    try {
        // API returns a simple success message on 200
        const response = await api.post<{ message: string }>('/auth/reset-password', {
            currentPassword,
            newPassword,
        });
        return response;
    } catch (error) {
        if (error instanceof ApiError) {
            console.error(`API Error resetting password (${error.status}): ${error.message}`, error.data);
            // Customize error message based on potential status codes (e.g., 403 for wrong current password)
            const userMessage = error.status === 403
                ? "Incorrect current password."
                : error.message || 'Failed to reset password.';
            throw new Error(userMessage);
        } else {
            console.error("Unexpected error resetting password:", error);
            throw new Error('An unexpected error occurred while resetting the password.');
        }
    }
};

// Define the custom hook
export const useResetPasswordMutation = () => {
    return useMutation<{ message: string }, Error, PasswordResetInput>({ // Specify Data, Error, and Variables types
        mutationFn: resetPassword,
        onSuccess: (data) => {
            console.log('Password reset successful:', data.message);
            toast.success(data.message || "Password reset successfully!");
            // No query invalidation needed here typically
        },
        onError: (error) => {
            console.error('Password reset failed:', error);
            toast.error(error.message || "Password reset failed. Please try again.");
        },
    });
}; 