'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';
import type { VocabularyEntryDTO, VocabularyBodySchema } from '@/types/api'; // Assume types are defined

// Define the payload type for the mutation function
interface AddVocabularyPayload {
    moduleId: string;
    data: VocabularyBodySchema;
}

// Define the API call function
const addVocabularyEntry = async ({ moduleId, data }: AddVocabularyPayload): Promise<VocabularyEntryDTO> => {
    try {
        const response = await api.post<VocabularyEntryDTO>(`/reading-modules/${moduleId}/vocabulary`, data);
        return response;
    } catch (error) {
        // Handle or transform error if needed, otherwise ApiError is thrown by interceptor
        console.error('Error adding vocabulary entry:', error);
        throw error; // Re-throw the error to be handled by useMutation
    }
};

// Define the custom hook
export const useAddVocabularyMutation = (moduleId: string): UseMutationResult<VocabularyEntryDTO, ApiError, VocabularyBodySchema> => {
    const queryClient = useQueryClient();

    return useMutation<VocabularyEntryDTO, ApiError, VocabularyBodySchema>({ // <TData, TError, TVariables>
        mutationFn: (data) => addVocabularyEntry({ moduleId, data }), // Pass data to the API call function
        onSuccess: (data) => {
            // Invalidate all vocabulary queries for this module
            queryClient.invalidateQueries({ queryKey: ['vocabulary', moduleId] });
            // Also invalidate the general module vocabulary query if it exists
            queryClient.invalidateQueries({ queryKey: ['moduleVocabulary', moduleId] });
        },
        onError: (error) => {
            // Display error toast
            toast.error(`Failed to add vocabulary: ${error.message}`);
            // Log the error for debugging
            console.error('Failed to add vocabulary entry:', error);
        },
    });
}; 