'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { StudentProgressDetailsDTO } from '@/types/api';

// Define the fetch function for student progress details
const fetchStudentProgressDetails = async (moduleId: string): Promise<StudentProgressDetailsDTO> => {
    if (!moduleId) {
        throw new Error('fetchStudentProgressDetails called without moduleId');
    }
    try {
        // Endpoint: GET /progress/details/{moduleId}
        const response = await api.get<StudentProgressDetailsDTO>(`/progress/details/${moduleId}`);
        
        // Ensure time tracking data is properly initialized
        if (response.progress) {
            response.progress.timeSpentMinutes = response.progress.timeSpentMinutes ?? 0;
            response.progress.startedAt = response.progress.startedAt ?? new Date().toISOString();
            response.progress.updatedAt = response.progress.updatedAt ?? new Date().toISOString();
        }
        
        return response;
    } catch (error) {
        console.error(`Error fetching progress details for module ${moduleId}:`, error);
        throw error; 
    }
};

// Define the custom hook for fetching student progress details
export const useStudentProgressDetailsQuery = (
    moduleId: string | undefined
): UseQueryResult<StudentProgressDetailsDTO, ApiError> => {
    return useQuery<StudentProgressDetailsDTO, ApiError, StudentProgressDetailsDTO, readonly [string, string | undefined]>({
        queryKey: ['studentProgressDetails', moduleId] as const, 
        queryFn: () => fetchStudentProgressDetails(moduleId!), 
        enabled: !!moduleId,
        staleTime: 1 * 60 * 1000, // Cache data for 1 minute
        refetchOnWindowFocus: true, // Refetch when window regains focus
        retry: (failureCount, error) => {
            // Don't retry on 401/403 errors (auth issues)
            if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as any).status;
                if (status === 401 || status === 403) {
                    return false;
                }
            }
            return failureCount < 2;
        },
    });
}; 