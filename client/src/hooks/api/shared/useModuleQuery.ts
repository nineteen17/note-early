'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { type ReadingModule } from '@/lib/schemas/modules';
import { ApiError } from '@/lib/apiClient'; // Assuming ApiError is defined here

// Define the function to fetch a single module
const fetchModule = async (moduleId: string): Promise<ReadingModule> => {
  if (!moduleId) {
    throw new Error('Module ID is required to fetch module details.');
  }
  // api.get likely returns the data directly
  const data = await api.get<ReadingModule>(`/reading-modules/${moduleId}`);
  return data; 
};

/**
 * Custom hook to fetch a single reading module by its ID.
 * Handles loading, error, and data states.
 * @param moduleId The ID of the module to fetch.
 * @param options Optional TanStack Query options.
 */
export const useModuleQuery = (moduleId: string, options?: { enabled?: boolean }) => {
  return useQuery<ReadingModule, ApiError>({ // Specify types for data and error
    queryKey: ['modules', moduleId], // Unique query key including the module ID
    queryFn: () => fetchModule(moduleId),
    enabled: !!moduleId && (options?.enabled !== false), // Ensure query only runs when moduleId is truthy and enabled is true (or not specified)
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 30, // Garbage collect cached data after 30 minutes of inactivity
    retry: 1, // Retry failed requests once
  });
}; 