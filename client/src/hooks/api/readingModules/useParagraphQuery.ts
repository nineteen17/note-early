import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { ReadingParagraphDTO } from '@/types/api';

// Define the API call function
const fetchParagraph = async (moduleId: string, paragraphIndex: number): Promise<ReadingParagraphDTO> => {
    try {
        // Endpoint is public, no authentication required
        const response = await api.instance.get<ReadingParagraphDTO>(`/reading-modules/${moduleId}/paragraph/${paragraphIndex}`);
        
        // The paragraph endpoint returns the data directly without the standard wrapper
        if (!response.data || typeof response.data !== 'object') {
            throw new ApiError('Invalid paragraph response: Response data is missing or invalid', 500);
        }

        // Validate the response structure matches ReadingParagraphDTO
        if (!('index' in response.data) || !('text' in response.data)) {
            throw new ApiError(
                'Invalid paragraph response structure: Response does not match expected ReadingParagraphDTO format. ' +
                'This endpoint is not listed in NON_STANDARD_ENDPOINTS but returns a non-standard response structure.',
                500
            );
        }

        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            'Failed to fetch paragraph: ' + (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
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