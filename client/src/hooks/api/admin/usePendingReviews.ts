import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { api } from '@/lib/apiClient';
import { StudentProgressSchema } from '@/types/api';

/**
 * Custom hook to calculate the total count of pending reviews.
 * Uses the same logic as the students table to count completed modules awaiting marking.
 */
export const usePendingReviews = () => {
  const { data: students, isLoading: isStudentsLoading } = useAdminStudentsQuery();
  
  // Create queries for each student using useQueries to avoid Rules of Hooks violation
  const progressQueries = useQueries({
    queries: (students || []).map(student => ({
      queryKey: ['admin', 'studentProgressList', student.profileId],
      queryFn: async (): Promise<StudentProgressSchema[]> => {
        if (!student.profileId) {
          return Promise.reject(new Error('Student ID is required to fetch progress list.'));
        }
        return api.get<StudentProgressSchema[]>(`/progress/admin/student/${student.profileId}`);
      },
      enabled: !!student.profileId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })),
  });
  
  // Calculate total pending reviews using the same logic as the students table
  const pendingCount = useMemo(() => {
    if (!students || progressQueries.some(query => query.isLoading)) {
      return null; // Still loading
    }
    
    let totalPending = 0;
    
    progressQueries.forEach((query) => {
      if (query.data) {
        // Count submissions awaiting marking (same logic as StudentRow component)
        const awaitingMarkingCount = query.data.filter(progress => 
          progress.completed && (!progress.score || !progress.teacherFeedback)
        ).length;
        
        totalPending += awaitingMarkingCount;
      }
    });
    
    return totalPending;
  }, [students, progressQueries]);
  
  const isLoading = isStudentsLoading || progressQueries.some(query => query.isLoading);
  
  return {
    data: pendingCount,
    isLoading,
    error: progressQueries.find(query => query.error)?.error || null
  };
}; 