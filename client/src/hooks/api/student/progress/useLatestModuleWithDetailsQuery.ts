// useLatestModuleWithDetailsQuery.ts
'use client';

import { useMemo } from 'react';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import type { StudentProgressSchema } from '@/types/api';

// Custom hook that gets the latest module progress AND its details
export const useLatestModuleWithDetailsQuery = () => {
  const { data: progress = [], isLoading: progressLoading, error: progressError } = useMyProgressQuery();

  // Get the latest module progress from progress data
  const latestModuleProgress = useMemo(() => {
    if (!progress.length) return null;
    
    return progress.reduce((latest, current) => {
      const latestDate = new Date(latest.updatedAt).getTime();
      const currentDate = new Date(current.updatedAt).getTime();
      return currentDate > latestDate ? current : latest;
    });
  }, [progress]);

  // Fetch module details for the latest module using your existing hook
  const { 
    data: moduleDetails, 
    isLoading: moduleLoading, 
    error: moduleError 
  } = useModuleQuery(
    latestModuleProgress?.moduleId || '', 
    { enabled: !!latestModuleProgress?.moduleId }
  );

  // Combine progress and module details
  const latestModuleWithDetails = useMemo(() => {
    if (!latestModuleProgress || !moduleDetails) return null;
    
    return {
      ...latestModuleProgress,
      moduleTitle: moduleDetails.title,
      moduleDescription: moduleDetails.description,
      moduleDetails,
    };
  }, [latestModuleProgress, moduleDetails]);

  return {
    data: latestModuleWithDetails,
    progress: latestModuleProgress, // Just the progress data if needed separately
    module: moduleDetails, // Just the module data if needed separately
    isLoading: progressLoading || moduleLoading,
    error: progressError || moduleError,
    isError: !!progressError || !!moduleError,
  };
};