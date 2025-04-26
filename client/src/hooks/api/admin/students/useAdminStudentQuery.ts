'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api';

// Define the fetch function for a single student
const fetchAdminStudent = async (profileId: string): Promise<ProfileDTO> => {
    if (!profileId) {
        // This case should ideally be handled by the `enabled` option
        throw new Error('fetchAdminStudent called without profileId');
    }
    try {
        // Endpoint according to Swagger: GET /profiles/admin/students/{profileId}
        const response = await api.get<ProfileDTO>(`/profiles/admin/students/${profileId}`);
        return response;
    } catch (error) {
        console.error('Error fetching admin student profile:', error);
        throw error; // Re-throw ApiError from interceptor
    }
};

// Define the custom hook for fetching a single student profile
export const useAdminStudentQuery = (
    profileId: string | undefined
): UseQueryResult<ProfileDTO, ApiError> => {
    return useQuery<ProfileDTO, ApiError, ProfileDTO, readonly [string, string | undefined]>({
        // Query key pattern: [scope, entity, id]
        queryKey: ['adminStudentProfile', profileId] as const, 
        queryFn: () => fetchAdminStudent(profileId!), // Fetch function, non-null assertion OK due to enabled flag
        enabled: !!profileId, // Only run the query if profileId is truthy
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
        // Consider gcTime, refetchOnWindowFocus based on requirements
    });
}; 