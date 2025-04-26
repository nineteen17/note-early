import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { ReadingParagraphDTO } from '@/types/api';

// Define the API call function
const fetchParagraph = async (moduleId: string, paragraphIndex: number): Promise<ReadingParagraphDTO> => {
    // Endpoint is public, no authentication required
    return api.get<ReadingParagraphDTO>(`/reading-modules/${moduleId}/paragraph/${paragraphIndex}`);
};

// Define the custom query hook
export function useParagraphQuery(moduleId: string, paragraphIndex: number, options?: {
    enabled?: boolean;
}) {
    const queryKey = ['readingModule', moduleId, 'paragraph', paragraphIndex];

    return useQuery<ReadingParagraphDTO, ApiError>({
        queryKey: queryKey,
        queryFn: () => fetchParagraph(moduleId, paragraphIndex),
        enabled: options?.enabled ?? (!!moduleId && paragraphIndex !== undefined && paragraphIndex !== null), // Only run if moduleId and paragraphIndex are provided
        // Optional: Configure stale time, cache time, etc.
        // staleTime: 1000 * 60 * 5, // 5 minutes
    });
} 