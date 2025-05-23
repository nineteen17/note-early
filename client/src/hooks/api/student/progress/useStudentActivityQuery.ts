'use client';

import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';

interface ActivityData {
  date: string;
  modulesActive: number;
  modulesCompleted: number;
  timeSpent: number;
  averageScore: number;
  lastActivity: string;
}

interface ActivityResponse {
  progressByDay: ActivityData[];
}

// Define the fetch function for student's activity data
const fetchStudentActivity = async (): Promise<ActivityResponse> => {
  try {
    console.log('Fetching student activity from /analytics/my-activity');
    const response = await api.get<ActivityResponse>('/analytics/my-activity');
    console.log('Raw API Response:', response);
    
    if (!response || !response.progressByDay) {
      console.error('Invalid API response structure:', response);
      throw new Error('Invalid response structure from API');
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching student activity:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch student activity: ${error.message}`);
    }
    throw error;
  }
};

// Define the custom hook for fetching student's activity data
export const useStudentActivityQuery = (
  options?: Omit<UseQueryOptions<ActivityResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<ActivityResponse, ApiError> => {
  return useQuery<ActivityResponse, ApiError>({
    queryKey: ['studentActivity'] as const,
    queryFn: fetchStudentActivity,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log('Query retry attempt:', failureCount, error);
      // Don't retry on 401/403 errors (auth issues)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) {
          return false;
        }
      }
      return failureCount < 2;
    },
    ...options
  });
};