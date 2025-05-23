import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import { StudentProgressDetailsDTO } from '@/shared/types';

// --- API Call Functions ---

// Function to fetch current student's detailed progress for a module
const getStudentModuleProgress = async (moduleId: string): Promise<StudentProgressDetailsDTO> => {
  if (!moduleId) {
    throw new Error("Module ID is required to fetch progress details.");
  }
  const response = await api.get<StudentProgressDetailsDTO>(`/api/v1/progress/details/${moduleId}`);
  return response;
};

// Function to submit a paragraph summary
const submitParagraphSummary = async (input: {
  moduleId: string;
  paragraphIndex: number;
  paragraphSummary: string;
  cumulativeSummary: string;
}): Promise<StudentProgressDetailsDTO> => {
  const response = await api.post<StudentProgressDetailsDTO>(
    `/api/v1/progress/submit-summary`,
    input
  );
  return response;
};

// --- Query Hooks ---

// Hook to fetch current student's detailed progress for a module
export const useStudentModuleProgressQuery = (
  moduleId: string,
  options?: Omit<UseQueryOptions<StudentProgressDetailsDTO, ApiError, StudentProgressDetailsDTO, readonly ["student-module-progress", string]>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  return useQuery<StudentProgressDetailsDTO, ApiError, StudentProgressDetailsDTO, readonly ["student-module-progress", string]>({
    queryKey: ['student-module-progress', moduleId] as const,
    queryFn: () => getStudentModuleProgress(moduleId),
    enabled: !!moduleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

// --- Mutation Hook for submitting summary ---
export const useSubmitSummaryMutation = (
  options?: Omit<UseMutationOptions<StudentProgressDetailsDTO, ApiError, {
    moduleId: string;
    paragraphIndex: number;
    paragraphSummary: string;
    cumulativeSummary: string;
  }>, 'mutationFn'>
) => {
  return useMutation<StudentProgressDetailsDTO, ApiError, {
    moduleId: string;
    paragraphIndex: number;
    paragraphSummary: string;
    cumulativeSummary: string;
  }>({
    mutationFn: submitParagraphSummary,
    ...options,
  });
};