'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { StudentProgressSchema } from '@/types/api'; // Ensure this type exists

// Define the fetch function for student's own progress
const fetchMyProgress = async (): Promise<StudentProgressSchema[]> => {
    try {
        // Endpoint: GET /progress/my-progress
        const response = await api.get<StudentProgressSchema[]>('/progress/my-progress');
        
        // Ensure time tracking data is properly initialized for each progress record
        return response.map(progress => ({
            ...progress,
            timeSpentMinutes: progress.timeSpentMinutes ?? 0,
            startedAt: progress.startedAt ?? progress.createdAt,
            updatedAt: progress.updatedAt ?? progress.createdAt
        }));
    } catch (error) {
        console.error('Error fetching student progress:', error);
        throw error; 
    }
};

// Define the custom hook for fetching student's own progress
export const useMyProgressQuery = (): UseQueryResult<StudentProgressSchema[], ApiError> => {
    return useQuery<StudentProgressSchema[], ApiError, StudentProgressSchema[], readonly [string]>({
        // Query key pattern: [scope, entity]
        queryKey: ['myProgress'] as const, 
        queryFn: fetchMyProgress, // Fetch function
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

