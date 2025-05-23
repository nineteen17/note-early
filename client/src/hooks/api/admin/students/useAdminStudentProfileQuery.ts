'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api';

// --- API Call Function ---
const fetchAdminStudentProfile = async (profileId: string): Promise<ProfileDTO> => {
  // Assuming api.get for this specific endpoint returns the ProfileDTO directly
  const response = await api.get<ProfileDTO>(`/profiles/admin/students/${profileId}`);
  
  // No need to check for response.data, return the response directly.
  // Type safety relies on the ProfileDTO type hint for api.get.
  return response;
};

// --- Query Hook ---
// Takes profileId as input, enabled only if profileId is provided
export const useAdminStudentProfileQuery = (
  profileId: string | null | undefined,
  options?: Omit<UseQueryOptions<ProfileDTO, ApiError>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  return useQuery<ProfileDTO, ApiError>({
    // Query key includes the profileId to ensure uniqueness
    queryKey: ['admin', 'studentProfile', profileId], 
    // Fetch data using the function above
    queryFn: () => fetchAdminStudentProfile(profileId!), // Use non-null assertion as it's enabled only if profileId exists
    // Enable the query only when profileId is truthy (not null, undefined, or empty string)
    enabled: !!profileId, 
    // Add other options like staleTime, gcTime if needed
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,  // 10 minutes
    ...options, // Spread any additional options provided
  });
}; 