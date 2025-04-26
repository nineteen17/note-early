'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';
import type { SubmitSummaryInput } from '@/types/api'; // Assuming this type exists

// Define the expected response structure based on Swagger
type SubmitSummaryResponse = {
    message: string;
    submissionId: string;
    progressStatus: {
        completed: boolean;
        highestParagraphIndexReached: number | null;
        finalSummary: string | null;
    };
};

// Define the API call function
const submitSummary = async (data: SubmitSummaryInput): Promise<SubmitSummaryResponse> => {
    try {
        // Endpoint: POST /progress/submit-summary
        const response = await api.post<SubmitSummaryResponse>('/progress/submit-summary', data);
        return response;
    } catch (error) {
        console.error('Error submitting summary:', error);
        throw error; // ApiError handled by interceptor/hook
    }
};

// Define the custom mutation hook
export const useSubmitSummaryMutation = (): UseMutationResult<
    SubmitSummaryResponse, // Type of data returned on success
    ApiError,             // Type of error
    SubmitSummaryInput    // Type of variables passed to mutate function
> => {
    const queryClient = useQueryClient();

    return useMutation<SubmitSummaryResponse, ApiError, SubmitSummaryInput>({
        mutationFn: submitSummary,
        onSuccess: (data, variables) => {
            // Invalidate the detailed progress for this specific module 
            // to refetch submissions and updated progress status.
            queryClient.invalidateQueries({
                queryKey: ['studentProgressDetails', variables.moduleId]
            });
            // Potentially invalidate the overall progress list too if status changes
            queryClient.invalidateQueries({ queryKey: ['myProgress'] });

            toast.success(data.message || 'Summary submitted successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to submit summary.');
        },
    });
}; 