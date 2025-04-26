'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/apiClient';

// Define the API call function
// The API returns 204 No Content, so the expected return type is void
const deleteVocabularyEntry = async (vocabularyId: string): Promise<void> => {
    try {
        await api.delete<void>(`/vocabulary/${vocabularyId}`);
    } catch (error) {
        console.error('Error deleting vocabulary entry:', error);
        throw error; // Re-throw ApiError from interceptor
    }
};

// Define the custom hook
// It needs the moduleId associated with the vocabulary entry for invalidation purposes
export const useDeleteVocabularyMutation = (
    moduleId: string // Pass moduleId to invalidate the correct query
): UseMutationResult<void, ApiError, string> => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({ // <TData = void, TError, TVariables = vocabularyId>
        mutationFn: deleteVocabularyEntry,
        onSuccess: (_, vocabularyId) => { // First arg is data (void), second is variables (vocabularyId)
            // Invalidate the query for the associated module's vocabulary
            queryClient.invalidateQueries({ queryKey: ['moduleVocabulary', moduleId] });

            // Optional: Optimistically remove the item from the cache
            // queryClient.setQueryData(['moduleVocabulary', moduleId], (oldData: VocabularyEntryDTO[] | undefined) => {
            //     return oldData?.filter(entry => entry.id !== vocabularyId) ?? [];
            // });

            toast.success(`Vocabulary entry deleted successfully!`);
        },
        onError: (error) => {
            toast.error(`Failed to delete vocabulary: ${error.message}`);
            console.error('Failed to delete vocabulary entry:', error);
        },
    });
}; 