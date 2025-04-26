import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { CreateStudentInput } from '@/types/api';

// Define the API call function
const createStudent = async (data: CreateStudentInput): Promise<{ message: string }> => {
    // Endpoint requires Admin/SuperAdmin authentication, apiClient handles the token
    // Expecting a 201 Created with a success message body
    return api.post<{ message: string }>('/auth/admin/student', data);
    // Note: Backend returns 201, but our api wrapper returns response.data directly.
    // If we needed the status code, we'd use apiClient.instance.post
};

// Define the custom mutation hook
export function useCreateStudentMutation() {
    const queryClient = useQueryClient();

    return useMutation<
        { message: string }, // Success response type
        ApiError,           // Error type
        CreateStudentInput  // Variables type
    >({
        mutationFn: createStudent,
        onSuccess: (data) => {
            console.log('Student created successfully:', data.message);
            // Invalidate the query for the list of admin-managed students
            // so it refetches with the new student included.
            queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
            // Handle success feedback in the component (e.g., close modal, show toast)
        },
        onError: (error) => {
            console.error('Create student failed:', error);
            // Handle error feedback in the component (e.g., show error message in form)
            // Check error.status (e.g., 403 for subscription limit)
        },
    });
} 