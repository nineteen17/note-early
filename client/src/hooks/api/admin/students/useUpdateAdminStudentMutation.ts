'use client';

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO, AdminUpdateStudentRequest } from '@/types/api';

// --- Type for Mutation Variables ---
interface UpdateAdminStudentVariables {
  profileId: string;
  updates: AdminUpdateStudentRequest;
}

// --- API Call Function ---
const updateAdminStudent = async ({ profileId, updates }: UpdateAdminStudentVariables): Promise<ProfileDTO> => {
  // Adjust based on your api.patch response structure
  const response = await api.patch<{ data: ProfileDTO }>(`/profiles/admin/students/${profileId}`, updates);
  
  // Assuming api.patch returns { data: ProfileDTO }
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  } else {
    console.error("Unexpected response structure from updateAdminStudent:", response);
    // Fallback attempt - adjust if api.patch returns the DTO directly
    return response as ProfileDTO; 
  }
};

// --- Mutation Hook ---
export const useUpdateAdminStudentMutation = (
  options?: Omit<UseMutationOptions<ProfileDTO, ApiError, UpdateAdminStudentVariables>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation<ProfileDTO, ApiError, UpdateAdminStudentVariables>({
    mutationFn: updateAdminStudent,
    // Optimistic updates or simple invalidation on success
    onSuccess: (data, variables, context) => {
      // Invalidate the specific student's profile query to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ['admin', 'studentProfile', variables.profileId]
      });
      // Optionally invalidate the list query if displayed fields might change
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      
      // Call user-provided onSuccess if it exists
      options?.onSuccess?.(data, variables, context);
    },
    ...options, // Spread any additional options provided
  });
}; 