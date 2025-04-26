'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { StudentProgressSchema } from '@/types/api';

// Define the fetch function
const fetchAdminModuleProgress = async (moduleId: string): Promise<StudentProgressSchema[]> => {
    if (!moduleId) {
        console.warn('fetchAdminModuleProgress called without moduleId');
        return []; // Return empty if no moduleId, enabled flag handles fetching
    }
    try {
        // Correct endpoint according to Swagger: /progress/admin/module/{moduleId}
        const response = await api.get<StudentProgressSchema[]>(`/progress/admin/module/${moduleId}`);
        return response;
    } catch (error) {
        console.error('Error fetching admin module progress:', error);
        throw error; // Re-throw ApiError from interceptor
    }
};

// Define the custom hook
export const useAdminModuleProgressQuery = (
    moduleId: string | undefined
): UseQueryResult<StudentProgressSchema[], ApiError> => {
    return useQuery<StudentProgressSchema[], ApiError, StudentProgressSchema[], readonly [string, string | undefined]>({
        queryKey: ['adminModuleProgress', moduleId] as const, // Query key includes identifier and moduleId
        queryFn: () => fetchAdminModuleProgress(moduleId!), // Fetch function
        enabled: !!moduleId, // Only run the query if moduleId is provided
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
        // Consider gcTime, refetchOnWindowFocus based on requirements
    });
}; 