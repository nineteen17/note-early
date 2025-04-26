import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { ReadingModuleDTO } from "@/types/api";

// Define the fetch function
const fetchMyModules = async (): Promise<ReadingModuleDTO[]> => {
  // Endpoint requires authentication, apiClient handles the token
  return await api.get<ReadingModuleDTO[]>("/reading-modules/my-modules");
};

// Define the custom hook
export const useMyModulesQuery = (options?: {
    // Add any specific TanStack Query options here if needed
    // For example: enabled, staleTime, etc.
    staleTime?: number;
    enabled?: boolean;
}) => {
    return useQuery<
        ReadingModuleDTO[], // Type of data returned by queryFn
        ApiError          // Type of error
    >({
        queryKey: ['admin', 'modules', 'my'], // Query key for caching
        queryFn: fetchMyModules,
        ...options, // Spread any additional options passed to the hook
    });
}; 