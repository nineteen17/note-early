import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { StudentProgressSchema } from '@/types/api'; // Import actual type

/**
 * API function to fetch the list of progress records for a specific student (Admin view).
 * @param studentId - The UUID of the student.
 * @returns Promise resolving to an array of StudentProgress records.
 */
const fetchAdminStudentProgressList = async (
  studentId: string
): Promise<StudentProgressSchema[]> => {
  if (!studentId) throw new Error("Student ID is required for fetchAdminStudentProgressList");
  // Use the generic api.get method, specifying the expected return type
  return api.get<StudentProgressSchema[]>(`/progress/admin/student/${studentId}`);
};

/**
 * Custom hook to fetch the list of progress records for a specific student (Admin view).
 * @param studentId - The ID of the student whose progress is being fetched.
 * @param options - Optional TanStack Query options.
 */
export const useAdminStudentProgressListQuery = (
  studentId: string | undefined,
  options?: {
    enabled?: boolean; // Add other TanStack Query options as needed
  }
) => {
  return useQuery<StudentProgressSchema[], Error>({
    queryKey: ['admin', 'studentProgressList', studentId],
    queryFn: () => {
      if (!studentId) {
        return Promise.reject(new Error('Student ID is required to fetch progress list.'));
      }
      // Call the locally defined fetch function
      return fetchAdminStudentProgressList(studentId);
    },
    enabled: !!studentId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 