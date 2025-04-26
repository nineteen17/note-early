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
        return response;
    } catch (error) {
        console.error(`Error fetching progress details for module ${moduleId}:`, error);
        // Assuming the interceptor handles ApiError creation and re-throwing
        throw error; 
    }
};

// Define the custom hook for fetching student progress details
export const useStudentProgressDetailsQuery = (
    moduleId: string | undefined
): UseQueryResult<StudentProgressDetailsDTO, ApiError> => {
    return useQuery<StudentProgressDetailsDTO, ApiError, StudentProgressDetailsDTO, readonly [string, string | undefined]>({
        // Query key pattern: [scope, entity, id/filter]
        queryKey: ['studentProgressDetails', moduleId] as const, 
        queryFn: () => fetchStudentProgressDetails(moduleId!), // Fetch function
        enabled: !!moduleId, // Only run the query if moduleId is provided
        staleTime: 1 * 60 * 1000, // Cache data for 1 minute, might need adjustment
        // gcTime, refetchOnWindowFocus etc. can be configured as needed
    });
}; 