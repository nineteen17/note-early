'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnalyticsDashboard, useProgressMetrics } from '@/features/student/progress/AnalyticsDashboard';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { StudentProgressSchema, ReadingModuleDTO } from '@/types/api';
import { ProgressFilters as ProgressFiltersComponent, type ProgressFilters as ProgressFiltersType, type SortOption } from './ProgressFilters';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

// Helper function to calculate progress percentage
function calculateProgressPercentage(current: number | null | undefined, total: number | null | undefined): number {
  if (!current || !total) return 0;
  return Math.round((current / total) * 100);
}

const STORAGE_KEY = 'student-progress-filters';

const InProgressModuleCard: React.FC<{ progress: StudentProgressSchema; moduleData: ReadingModuleDTO }> = ({ progress, moduleData }) => {
  const router = useRouter();

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer flex-1">
                <h3 className="text-lg font-semibold leading-tight line-clamp-2">{moduleData.title}</h3>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{moduleData.title}</p>
            </TooltipContent>
          </Tooltip>
          <Badge variant="secondary" className="flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline ml-1">In Progress</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Progress</span>
              <div className="font-medium">
                {progress.highestParagraphIndexReached || 0} of {moduleData.paragraphCount}
              </div>
            </div>
            {progress.timeSpentMinutes ? (
              <div className="space-y-1">
                <span className="text-muted-foreground">Time Spent</span>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {progress.timeSpentMinutes}m
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-muted-foreground">Level</span>
                <div className="font-medium">Level {moduleData.level}</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData.paragraphCount)}%</span>
            </div>
            <Progress 
              value={calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData.paragraphCount)} 
              className="h-2" 
              variant="in-progress"
            />
          </div>

          {/* Last Accessed */}
          <div className="text-xs text-muted-foreground">
            Last accessed {formatDistanceToNow(new Date(progress.startedAt || progress.createdAt), { addSuffix: true })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline"
            size="sm"
            className="flex-1" 
            onClick={() => router.push(`/student/modules/${progress.moduleId}`)}
          >
            Details
          </Button>
          <Button 
            variant="default"
            size="sm"
            className="flex-1" 
            onClick={() => router.push(`/student/progress/${progress.moduleId}/reading`)}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const StudentProgressList: React.FC<{ showCompleted?: boolean; sortBy: SortOption; searchQuery?: string; levels?: number[] }> = ({ 
  showCompleted = false, 
  sortBy,
  searchQuery = '',
  levels
}) => {
  const { data: progressList, isLoading: isLoadingProgress, error: progressError } = useMyProgressQuery();
  const { data: modules, isLoading: isLoadingModules, error: modulesError } = useAllActiveModulesQuery();
  
  // Create maps for module data lookup
  const moduleDataMap = React.useMemo(() => {
    if (!modules) return new Map<string, ReadingModuleDTO>();
    return new Map(modules.map(module => [module.id, module]));
  }, [modules]);

  // Filter and sort modules
  const filtered = React.useMemo(() => {
    if (!progressList) return [];
    
    let filtered = progressList.filter(progress => showCompleted ? progress.completed : !progress.completed);
    
    // Apply search filter if searchQuery exists
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(progress => {
        const moduleData = moduleDataMap.get(progress.moduleId);
        if (!moduleData) return false;
        
        const titleMatch = moduleData.title.toLowerCase().includes(searchLower);
        const descriptionMatch = moduleData.description?.toLowerCase().includes(searchLower) ?? false;
        return titleMatch || descriptionMatch;
      });
    }

    // Apply level filter if levels exist
    if (levels && levels.length > 0) {
      filtered = filtered.filter(progress => {
        const moduleData = moduleDataMap.get(progress.moduleId);
        return moduleData && levels.includes(moduleData.level);
      });
    }
    
    return filtered;
  }, [progressList, showCompleted, searchQuery, levels, moduleDataMap]);
  
  const sorted = React.useMemo(() => {
    if (!filtered) return [];
    
    return [...filtered].sort((a, b) => {
      const moduleA = moduleDataMap.get(a.moduleId);
      const moduleB = moduleDataMap.get(b.moduleId);
      
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'progress-high':
          return (b.highestParagraphIndexReached || 0) - (a.highestParagraphIndexReached || 0);
        case 'progress-low':
          return (a.highestParagraphIndexReached || 0) - (b.highestParagraphIndexReached || 0);
        case 'score-high':
          return (b.score || 0) - (a.score || 0);
        case 'score-low':
          return (a.score || 0) - (b.score || 0);
        case 'level-high':
          return (moduleB?.level || 0) - (moduleA?.level || 0);
        case 'level-low':
          return (moduleA?.level || 0) - (moduleB?.level || 0);
        case 'alphabetical':
          return (moduleA?.title || '').localeCompare(moduleB?.title || '');
        default:
          return 0;
      }
    });
  }, [filtered, sortBy, moduleDataMap]);

  if (isLoadingProgress || isLoadingModules) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-6 w-48 flex-1" />
                <Skeleton className="h-6 w-16 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (progressError || modulesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {progressError?.message || modulesError?.message || 'Failed to load progress data. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (sorted.length === 0) {
    if (searchQuery || (levels && levels.length > 0)) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Matching Modules</h3>
            <p className="text-muted-foreground">
              No modules match your current filters. Try adjusting your filters to see more results.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Modules in Progress</h3>
          <p className="text-muted-foreground">
            Start a module to begin tracking your progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((progress) => {
          const moduleData = moduleDataMap.get(progress.moduleId);
          if (!moduleData) return null;

          return (
            <InProgressModuleCard 
              key={progress.id} 
              progress={progress} 
              moduleData={moduleData}
            />
          );
        })}
      </div>
    </TooltipProvider>
  );
};

// Main exported feature component
export function ProgressFeature() {
  const router = useRouter();
  const { data: progress = [] } = useMyProgressQuery();
  const progressMetrics = useProgressMetrics(progress);
  const [filterState, setFilterState] = useState<ProgressFiltersType>(() => {
    if (typeof window === 'undefined') return { sort: 'recent' };
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { sort: 'recent' };
  });

  const handleTabChange = (value: string) => {
    if (value === 'completed') {
      router.push('/student/progress/completed');
    } else {
      router.push('/student/progress');
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
  }, [filterState]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader 
          title="My Progress"
          description="Track your reading progress and module completion"
        />
        
        <Tabs 
          value="in-progress"
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 p-2">
            <TabsTrigger value="in-progress">In Progress ({progressMetrics.inProgressCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({progressMetrics.completedCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <ProgressFiltersComponent 
          filterState={filterState}
          onFilterChange={setFilterState}
        />

        <StudentProgressList 
          showCompleted={false} 
          sortBy={filterState.sort} 
          searchQuery={filterState.search}
          levels={filterState.levels}
        />
      </div>
    </PageContainer>
  );
} 