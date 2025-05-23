import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { StudentProgressDetailsDTO } from '@/types/api'; // Import actual type

/**
 * API function to fetch detailed progress for a specific student and module (Admin view).
 * @param studentId - The UUID of the student.
 * @param moduleId - The UUID of the module.
 * @returns Promise resolving to the detailed progress including submissions.
 */
const fetchAdminStudentModuleDetail = async (
  studentId: string,
  moduleId: string
): Promise<StudentProgressDetailsDTO> => {
  if (!studentId || !moduleId) throw new Error("Student ID and Module ID are required for fetchAdminStudentModuleDetail");
  // Use the generic api.get method, specifying the expected return type
  return api.get<StudentProgressDetailsDTO>(`/api/v1/progress/admin/student/${studentId}/module/${moduleId}`);
};

/**
 * Custom hook to fetch detailed progress for a specific student and module (Admin view).
 * @param studentId - The ID of the student.
 * @param moduleId - The ID of the module.
 * @param options - Optional TanStack Query options.
 */
export const useAdminStudentModuleDetailQuery = (
  studentId: string | undefined,
  moduleId: string | undefined,
  options?: {
    enabled?: boolean; // Add other TanStack Query options as needed
  }
) => {
  return useQuery<StudentProgressDetailsDTO, Error>({
    queryKey: ['admin', 'studentModuleDetail', studentId, moduleId],
    queryFn: () => {
      if (!studentId || !moduleId) {
        return Promise.reject(new Error('Student ID and Module ID are required to fetch details.'));
      }
      // Call the locally defined fetch function
      return fetchAdminStudentModuleDetail(studentId, moduleId);
    },
    enabled: !!studentId && !!moduleId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}; 