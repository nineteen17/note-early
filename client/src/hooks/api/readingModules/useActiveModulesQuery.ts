import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { ReadingModuleDTO } from '@/types/api';

// Define the API call function
const fetchActiveModules = async (): Promise<ReadingModuleDTO[]> => {
    // Endpoint is public, no authentication required
    return api.get<ReadingModuleDTO[]>('/reading-modules/active');
};

// Define the query key
const queryKey = ['readingModules', 'active'];

// Define the custom query hook
export function useActiveModulesQuery() {
    return useQuery<ReadingModuleDTO[], ApiError>({
        queryKey: queryKey,
        queryFn: fetchActiveModules,
        // Optional: Configure stale time, cache time, etc.
        // staleTime: 1000 * 60 * 5, // 5 minutes
    });
} 