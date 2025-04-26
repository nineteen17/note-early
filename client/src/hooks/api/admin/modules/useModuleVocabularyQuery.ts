'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { VocabularyEntryDTO } from '@/types/api';

// Define the fetch function
const fetchModuleVocabulary = async (moduleId: string): Promise<VocabularyEntryDTO[]> => {
    if (!moduleId) {
        // Handle the case where moduleId is not provided, perhaps return empty array or throw?
        // For now, let's return an empty array to avoid breaking the query if ID isn't ready.
        // Consider using the `enabled` option in useQuery if the ID might be missing initially.
        console.warn('fetchModuleVocabulary called without moduleId');
        return [];
    }
    try {
        const response = await api.get<VocabularyEntryDTO[]>(`/reading-modules/${moduleId}/vocabulary`);
        return response;
    } catch (error) {
        // The ApiError should already be thrown by the apiClient interceptor
        // Log it or handle specific statuses if needed
        console.error('Error fetching module vocabulary:', error);
        // Re-throw the error to be caught by React Query
        throw error;
    }
};

// Define the custom hook
export const useModuleVocabularyQuery = (moduleId: string | undefined): UseQueryResult<VocabularyEntryDTO[], ApiError> => {
    return useQuery<VocabularyEntryDTO[], ApiError, VocabularyEntryDTO[], readonly [string, string | undefined]>({ // Explicitly type queryKey
        queryKey: ['moduleVocabulary', moduleId] as const, // Use as const for type safety
        queryFn: () => fetchModuleVocabulary(moduleId!), // Use non-null assertion, enabled handles undefined
        enabled: !!moduleId, // Only run the query if moduleId is defined
        staleTime: 5 * 60 * 1000, // 5 minutes, vocabulary might not change often within a session
        // Add other options like gcTime, refetchOnWindowFocus as needed
    });
}; 