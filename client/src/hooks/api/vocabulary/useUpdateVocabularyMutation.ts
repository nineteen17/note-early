'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';
import type { VocabularyEntryDTO, UpdateVocabularyInput } from '@/types/api';

// Define the payload type for the mutation function
interface UpdateVocabularyPayload {
    vocabularyId: string;
    data: UpdateVocabularyInput; // This should be Partial<VocabularyBodySchema>
}

// Define the API call function
const updateVocabularyEntry = async ({ vocabularyId, data }: UpdateVocabularyPayload): Promise<VocabularyEntryDTO> => {
    try {
        // Using PUT as specified in the Swagger doc for update
        const response = await api.put<VocabularyEntryDTO>(`/vocabulary/${vocabularyId}`, data);
        return response;
    } catch (error) {
        console.error('Error updating vocabulary entry:', error);
        throw error; // Re-throw ApiError from interceptor
    }
};

// Define the custom hook
// It needs the moduleId associated with the vocabulary entry for invalidation purposes
export const useUpdateVocabularyMutation = (
    moduleId: string // Pass moduleId to invalidate the correct query
): UseMutationResult<VocabularyEntryDTO, ApiError, UpdateVocabularyPayload> => {
    const queryClient = useQueryClient();

    return useMutation<VocabularyEntryDTO, ApiError, UpdateVocabularyPayload>({ // <TData, TError, TVariables = { vocabularyId: string, data: UpdateVocabularyInput }>
        mutationFn: updateVocabularyEntry,
        onSuccess: (updatedEntry) => {
            // Invalidate the query for the associated module's vocabulary
            queryClient.invalidateQueries({ queryKey: ['moduleVocabulary', moduleId] });

            // Optional: Update the specific entry in the cache directly for immediate UI feedback
            // queryClient.setQueryData(['moduleVocabulary', moduleId], (oldData: VocabularyEntryDTO[] | undefined) => {
            //     return oldData?.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry) ?? [];
            // });

            toast.success(`Vocabulary word "${updatedEntry.word}" updated successfully!`);
        },
        onError: (error) => {
            toast.error(`Failed to update vocabulary: ${error.message}`);
            console.error('Failed to update vocabulary entry:', error);
        },
    });
}; 