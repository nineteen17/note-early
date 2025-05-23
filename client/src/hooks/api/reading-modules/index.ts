import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ReadingModuleDTO, VocabularyEntryDTO } from '@/types/api'; // Ensure this type is correct

// --- API Call Functions ---

// Function to fetch active reading modules
const getActiveModules = async (): Promise<ReadingModuleDTO[]> => {
  // Use the api helper which handles standard response structure
  const response = await api.get<ReadingModuleDTO[]>('/reading-modules/active');
  return response;
};

// --- API Call Function to fetch a single reading module by ID ---
const getReadingModuleById = async (moduleId: string): Promise<ReadingModuleDTO> => {
  if (!moduleId) {
    throw new Error("Module ID is required to fetch a module.");
  }
  // Endpoint: /reading-modules/{id}
  const response = await api.get<ReadingModuleDTO>(`/reading-modules/${moduleId}`);
  return response;
};

// --- API Call Function for Paragraph Vocabulary ---
const getParagraphVocabulary = async (moduleId: string, paragraphIndex: number): Promise<VocabularyEntryDTO[]> => {
  if (!moduleId || !paragraphIndex || paragraphIndex <= 0) {
    throw new Error("Module ID and valid Paragraph Index (1-based) are required.");
  }
  // Endpoint: /reading-modules/{moduleId}/paragraphs/{paragraphIndex}/vocabulary
  const response = await api.get<VocabularyEntryDTO[]>(`/reading-modules/${moduleId}/paragraphs/${paragraphIndex}/vocabulary`);
  return response;
};

// --- Query Hooks ---

// Hook to fetch active reading modules
export const useActiveModulesQuery = (
  options?: Omit<UseQueryOptions<ReadingModuleDTO[], ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ReadingModuleDTO[], ApiError>({
    queryKey: ['modules', 'active'], // Query key for caching
    queryFn: getActiveModules, // The function to call
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    // Spread any additional options like onSuccess, onError, enabled, etc.
    ...options,
  });
};

// --- Query Hook to fetch a single reading module by ID ---
export const useModuleQuery = (
  moduleId: string,
  options?: Omit<UseQueryOptions<ReadingModuleDTO, ApiError, ReadingModuleDTO, readonly ["reading-module", string]>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  return useQuery<ReadingModuleDTO, ApiError, ReadingModuleDTO, readonly ["reading-module", string]>({
    queryKey: ['reading-module', moduleId] as const, // Query key specific to the module ID
    queryFn: () => getReadingModuleById(moduleId),    // Use the new fetch function
    enabled: !!moduleId,                             // Only run if moduleId is available
    staleTime: 1000 * 60 * 5, // 5 minutes, can be adjusted
    ...options,
  });
};

// Keep the active modules query if it's used elsewhere (e.g., for browsing lists)
// API call function to fetch ALL active reading modules (curated and custom)
const getAllActiveReadingModules = async (): Promise<ReadingModuleDTO[]> => {
  const response = await api.get<ReadingModuleDTO[]>('/reading-modules/active');
  return response;
};

// Query hook to fetch ALL active reading modules
export const useAllActiveModulesQuery = ( // Renamed for clarity
  options?: Omit<UseQueryOptions<ReadingModuleDTO[], ApiError, ReadingModuleDTO[], readonly ["reading-modules", "all-active-list"]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ReadingModuleDTO[], ApiError, ReadingModuleDTO[], readonly ["reading-modules", "all-active-list"]>({
    queryKey: ['reading-modules', 'all-active-list'] as const,
    queryFn: getAllActiveReadingModules,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// --- Query Hook for Paragraph Vocabulary ---
export const useParagraphVocabularyQuery = (
  moduleId: string,
  paragraphIndex: number, // 1-based index
  options?: Omit<UseQueryOptions<VocabularyEntryDTO[], ApiError, VocabularyEntryDTO[], readonly ["vocabulary", string, number]>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  const isEnabled = !!moduleId && !!paragraphIndex && paragraphIndex > 0;

  return useQuery<VocabularyEntryDTO[], ApiError, VocabularyEntryDTO[], readonly ["vocabulary", string, number]>({
    // Query key includes module and paragraph index
    queryKey: ['vocabulary', moduleId, paragraphIndex] as const,
    queryFn: () => getParagraphVocabulary(moduleId, paragraphIndex),
    enabled: isEnabled, // Only run if module and valid index are provided
    staleTime: 1000 * 60 * 15, // Vocabulary likely doesn't change often, 15 mins
    ...options,
  });
}; 