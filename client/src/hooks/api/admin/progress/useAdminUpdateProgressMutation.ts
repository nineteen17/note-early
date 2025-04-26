'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';
import type { StudentProgressSchema, AdminUpdateProgressInput } from '@/types/api';

// Define the payload type for the mutation function
interface UpdateProgressPayload {
    progressId: string;
    data: AdminUpdateProgressInput;
}

// Define the API call function
const updateAdminProgress = async ({ progressId, data }: UpdateProgressPayload): Promise<StudentProgressSchema> => {
    try {
        // Correct endpoint according to Swagger: PATCH /progress/admin/update/{progressId}
        const response = await api.patch<StudentProgressSchema>(`/progress/admin/update/${progressId}`, data);
        return response;
    } catch (error) {
        console.error('Error updating admin progress:', error);
        throw error; // Re-throw ApiError from interceptor
    }
};

// Define the custom hook
export const useAdminUpdateProgressMutation = (
    // We might need moduleId if we want to invalidate the module-specific progress list
    moduleId?: string 
): UseMutationResult<StudentProgressSchema, ApiError, UpdateProgressPayload> => {
    const queryClient = useQueryClient();

    return useMutation<StudentProgressSchema, ApiError, UpdateProgressPayload>({ // <TData, TError, TVariables>
        mutationFn: updateAdminProgress,
        onSuccess: (updatedProgress, variables) => {
            // Invalidate queries related to progress
            // 1. Invalidate the general progress list for the specific module (if moduleId provided)
            if (moduleId) {
                queryClient.invalidateQueries({ queryKey: ['adminModuleProgress', moduleId] });
            }
            // 2. Invalidate the specific student's overall progress list (if we have a hook for that)
            // queryClient.invalidateQueries({ queryKey: ['studentProgressList', updatedProgress.studentId] }); 
            // 3. Invalidate any query fetching this specific progress record by its ID (if exists)
            queryClient.invalidateQueries({ queryKey: ['progressDetail', variables.progressId] }); 

            // Optional: Update the cache directly
            // Can update both the module progress list and potentially a detail view
            if (moduleId) {
                 queryClient.setQueryData<StudentProgressSchema[]>(['adminModuleProgress', moduleId], (oldData) => 
                     oldData?.map(p => p.id === updatedProgress.id ? updatedProgress : p) ?? []
                 );
            }
            // queryClient.setQueryData(['progressDetail', variables.progressId], updatedProgress);

            toast.success(`Progress record updated successfully!`);
        },
        onError: (error) => {
            toast.error(`Failed to update progress: ${error.message}`);
            console.error('Failed to update progress record:', error);
        },
    });
}; 