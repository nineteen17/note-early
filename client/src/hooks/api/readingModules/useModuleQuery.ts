import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { ReadingModuleDTO } from '@/types/api';

// Define the API call function
const fetchModule = async (moduleId: string): Promise<ReadingModuleDTO> => {
    // Endpoint is public, no authentication required
    return api.get<ReadingModuleDTO>(`/reading-modules/${moduleId}`);
};

// Define the custom query hook
export function useModuleQuery(moduleId: string, options?: {
    enabled?: boolean;
}) {
    const queryKey = ['readingModule', moduleId];

    return useQuery<ReadingModuleDTO, ApiError>({
        queryKey: queryKey,
        queryFn: () => fetchModule(moduleId),
        enabled: options?.enabled ?? !!moduleId, // Only run if moduleId is provided
        // Optional: Configure stale time, cache time, etc.
        // staleTime: 1000 * 60 * 5, // 5 minutes
    });
} 