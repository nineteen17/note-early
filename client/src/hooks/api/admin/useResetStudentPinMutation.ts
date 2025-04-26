import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { ResetStudentPinInput } from '@/types/api';

// Define the API call function
const resetStudentPin = async (data: ResetStudentPinInput): Promise<{ message: string }> => {
    // Endpoint requires Admin/SuperAdmin authentication, apiClient handles the token
    // Expecting a 200 OK with a success message body
    return api.post<{ message: string }>('/auth/admin/student/reset-pin', data);
};

// Define the custom mutation hook
export function useResetStudentPinMutation() {
    // Note: Invalidating specific student data might be complex here without knowing
    // which student list or detail view might be affected. Usually, a success message
    // suffices, and relevant views will refetch if necessary based on standard stale times.
    // const queryClient = useQueryClient();

    return useMutation<
        { message: string }, // Success response type
        ApiError,           // Error type
        ResetStudentPinInput  // Variables type
    >({
        mutationFn: resetStudentPin,
        onSuccess: (data) => {
            console.log('Student PIN reset successful:', data.message);
            // Handle success feedback in the component (e.g., close modal, show toast)
            // Example invalidation if needed:
            // queryClient.invalidateQueries({ queryKey: ['admin', 'student', variables.studentId] });
        },
        onError: (error) => {
            console.error('Reset student PIN failed:', error);
            // Handle error feedback in the component
            // Check error.status (e.g., 403 for permission, 404 for not found)
        },
    });
} 