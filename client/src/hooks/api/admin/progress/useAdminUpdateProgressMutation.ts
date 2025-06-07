'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient'; // Import api object
import { AdminUpdateProgressFormInput } from '@/lib/schemas/progress';
import { StudentProgressSchema } from '@/types/api'; // Import actual type
import { toast } from 'sonner';

interface UpdateProgressPayload {
  progressId: string;
  data: AdminUpdateProgressFormInput;
}

/**
 * API function to update a student's progress record (Admin action).
 * @param progressId - The UUID of the progress record to update.
 * @param data - The update payload.
 * @returns Promise resolving to the updated StudentProgress record.
 */
const updateAdminStudentProgress = async (
  progressId: string,
  data: AdminUpdateProgressFormInput
): Promise<StudentProgressSchema> => {
  if (!progressId) throw new Error("Progress ID is required for updateAdminStudentProgress");
  if (Object.keys(data).length === 0) {
    console.warn("Attempting to update progress with empty data object.");
    // Decide if you should throw an error or return early based on your needs
    // For now, let the API call proceed and let the backend potentially handle it
  }
  // Use the generic api.patch method
  return api.patch<StudentProgressSchema>(`/progress/admin/update/${progressId}`, data);
};


/**
 * Custom hook mutation to update a student's progress record (Admin action).
 */
export const useAdminUpdateProgressMutation = () => {
  const queryClient = useQueryClient();

  // Use the correct type StudentProgressSchema for the mutation result
  return useMutation<StudentProgressSchema, Error, UpdateProgressPayload>({
    // Call the locally defined update function
    mutationFn: ({ progressId, data }: UpdateProgressPayload) => {
      return updateAdminStudentProgress(progressId, data);
    },
    onSuccess: (updatedProgress, variables) => {
      toast.success('Progress updated successfully!');

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['admin', 'studentModuleDetail', updatedProgress.studentId, updatedProgress.moduleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'studentProgressList', updatedProgress.studentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'studentProfile', updatedProgress.studentId]
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update progress.');
      console.error("Error updating progress:", error);
    },
  });
}; 