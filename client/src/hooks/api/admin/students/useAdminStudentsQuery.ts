'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api'; // API returns an array of ProfileDTO
import { useAuthStore } from '@/store/authStore';

// Define the query function
const fetchAdminStudents = async (): Promise<ProfileDTO[]> => {
  // API endpoint might return { status: 'success', data: ProfileDTO[] }
  const response = await api.get<{ data: ProfileDTO[] }>('/profiles/admin/students'); // Assuming endpoint requires auth implicitly
  
  // Assuming api.get returns the nested data array directly or wrapped in { data: ... }
  if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
    return response.data;
  } else if (Array.isArray(response)) {
      // Fallback if the response is the array directly
      return response;
  } else {
    console.error("Unexpected response structure from fetchAdminStudents:", response);
    throw new ApiError('Invalid response structure from server', 500);
  }
};

// Define the custom hook
export const useAdminStudentsQuery = (
  options?: Omit<UseQueryOptions<ProfileDTO[], ApiError>, 'queryKey' | 'queryFn'>
) => {
    // Removed userRole and isAuthorized constants as they are redundant
    // console.log('useAdminStudentsQuery - Role:', userRole, 'Is Authorized:', isAuthorized);

    return useQuery<ProfileDTO[], ApiError>({
        // Query key includes 'admin' scope for better cache isolation
        queryKey: ['admin', 'students'],
        queryFn: fetchAdminStudents,
        // Default staleTime can be adjusted based on how often the list needs to be fresh
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,  // 10 minutes
        retry: 1,
        // Enable query unless explicitly disabled via options
        // Backend middleware handles authorization
        enabled: options?.enabled !== false, // Simplified enabled check
        ...options, // Allow overriding defaults
    });
}; 