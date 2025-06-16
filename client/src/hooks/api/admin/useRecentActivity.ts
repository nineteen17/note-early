import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { api } from '@/lib/apiClient';
import { StudentProgressSchema } from '@/types/api';

export interface RecentActivityItem {
  id: string;
  type: 'student_progress' | 'module_completion' | 'new_student';
  title: string;
  description: string;
  timestamp: string; // ISO date string
  studentName?: string;
  moduleName?: string;
}

/**
 * Custom hook to generate recent activity from real data sources.
 * Creates activity items from student progress and new student data.
 */
export const useRecentActivity = () => {
  const { data: students, isLoading: isStudentsLoading } = useAdminStudentsQuery();
  
  // Get progress data for each student to generate activity
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
      staleTime: 2 * 60 * 1000, // 2 minutes for activity data
    })),
  });
  
  // Generate recent activity items from real data
  const recentActivities = useMemo((): RecentActivityItem[] => {
    if (!students || progressQueries.some(query => query.isLoading)) {
      return [];
    }
    
    const activities: RecentActivityItem[] = [];
    
    // 1. Add recent student registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    students
      .filter(student => student.createdAt && new Date(student.createdAt) > sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 3) // Limit to 3 most recent
      .forEach(student => {
        activities.push({
          id: `new-student-${student.profileId}`,
          type: 'new_student',
          title: 'New Student Added',
          description: `${student.fullName} joined the platform`,
          timestamp: student.createdAt!,
          studentName: student.fullName || 'Unknown Student'
        });
      });
    
    // 2. Add recent progress updates and completions
    progressQueries.forEach((query, index) => {
      const student = students[index];
      if (query.data && student) {
        // Recent completions (last 3 days)
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        
        query.data
          .filter(progress => 
            progress.completed && 
            progress.completedAt && 
            new Date(progress.completedAt) > threeDaysAgo
          )
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
          .slice(0, 2) // Limit per student
          .forEach(progress => {
            activities.push({
              id: `completion-${progress.studentId}-${progress.moduleId}`,
              type: 'module_completion',
              title: 'Module Completed',
              description: `${student.fullName} completed a reading module`,
              timestamp: progress.completedAt!,
              studentName: student.fullName || 'Unknown Student',
              moduleName: 'Reading Module' // We don't have module title in progress data
            });
          });
        
        // Recent progress updates (started modules in last 2 days)
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        
        query.data
          .filter(progress => 
            !progress.completed && 
            progress.startedAt && 
            new Date(progress.startedAt) > twoDaysAgo
          )
          .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
          .slice(0, 1) // Limit per student
          .forEach(progress => {
            activities.push({
              id: `progress-${progress.studentId}-${progress.moduleId}`,
              type: 'student_progress',
              title: 'Module Started',
              description: `${student.fullName} started a new reading module`,
              timestamp: progress.startedAt!,
              studentName: student.fullName || 'Unknown Student',
              moduleName: 'Reading Module'
            });
          });
      }
    });
    
    // Sort all activities by timestamp (most recent first) and limit to 8
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
      
  }, [students, progressQueries]);
  
  const isLoading = isStudentsLoading || progressQueries.some(query => query.isLoading);
  
  return {
    data: recentActivities,
    isLoading,
    error: progressQueries.find(query => query.error)?.error || null
  };
}; 