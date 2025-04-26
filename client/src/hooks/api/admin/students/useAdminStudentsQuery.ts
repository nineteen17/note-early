import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api'; // API returns an array of ProfileDTO
import { useAuthStore } from '@/store/authStore';

// Define the query function
const fetchAdminStudents = async (): Promise<ProfileDTO[]> => {
  try {
    // Endpoint requires Admin/SuperAdmin auth, handled by API route & apiClient token
    const data = await api.get<ProfileDTO[]>('/profiles/admin/students');
    console.log("api.get /profiles/admin/students = ", data);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
        console.error(`API Error fetching students (${error.status}): ${error.message}`, error.data);
        throw new Error(error.message || 'Failed to fetch students.');
    } else {
        console.error("Unexpected error fetching students:", error);
        throw new Error('An unexpected error occurred while fetching students.');
    }
  }
};

// Define the custom hook
export const useAdminStudentsQuery = (options?: {
    enabled?: boolean;
    staleTime?: number;
    // Add other relevant useQuery options like gcTime, refetchInterval, etc.
}) => {
    // Removed userRole and isAuthorized constants as they are redundant
    // console.log('useAdminStudentsQuery - Role:', userRole, 'Is Authorized:', isAuthorized);

    return useQuery<ProfileDTO[], Error>({
        // Query key includes 'admin' scope for better cache isolation
        queryKey: ['admin', 'students'],
        queryFn: fetchAdminStudents,
        // Default staleTime can be adjusted based on how often the list needs to be fresh
        staleTime: 1000 * 60 * 5, // Example: 5 minutes stale time
        retry: 1,
        // Enable query unless explicitly disabled via options
        // Backend middleware handles authorization
        enabled: options?.enabled !== false, // Simplified enabled check
        ...options, // Allow overriding defaults
    });
}; 