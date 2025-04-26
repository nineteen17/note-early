'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';
import type { StartModuleInput, StudentProgressSchema } from '@/types/api'; // Assuming these types exist

// Type for the response which includes a message and the progress record
type StartModuleResponse = {
    message: string;
    progress: StudentProgressSchema;
};

// Define the API call function
const startModule = async (data: StartModuleInput): Promise<StartModuleResponse> => {
    try {
        // Endpoint: POST /progress/start
        const response = await api.post<StartModuleResponse>('/progress/start', data);
        return response;
    } catch (error) {
        console.error('Error starting module progress:', error);
        throw error; // ApiError handled by interceptor/hook
    }
};

// Define the custom mutation hook
export const useStartModuleMutation = (): UseMutationResult<
    StartModuleResponse, // Type of data returned on success
    ApiError,           // Type of error
    StartModuleInput    // Type of variables passed to mutate function
> => {
    const queryClient = useQueryClient();

    return useMutation<StartModuleResponse, ApiError, StartModuleInput>({
        mutationFn: startModule,
        onSuccess: (data) => {
            // Invalidate queries that might depend on this new progress record
            // e.g., the student's overall progress list
            queryClient.invalidateQueries({ queryKey: ['myProgress'] });
            // Optionally, update the cache directly for a specific module detail query if needed
            // queryClient.setQueryData(['studentProgressDetails', data.progress.moduleId], ...);
            
            toast.success(data.message || 'Module started successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to start module.');
        },
    });
}; 