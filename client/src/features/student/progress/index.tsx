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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{moduleData.title}</h3>
              <Badge variant="secondary">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">In Progress</span>
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {moduleData.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">
                {progress.highestParagraphIndexReached || 0} of {moduleData.paragraphCount} paragraphs
              </span>
              {progress.timeSpentMinutes ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{progress.timeSpentMinutes} minutes</span>
                  <span className="sm:hidden">{progress.timeSpentMinutes}m</span>
                </span>
              ) : null}
            </div>
            <span className="text-xs sm:text-sm">
              Last accessed: {formatDistanceToNow(new Date(progress.startedAt || progress.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData.paragraphCount)}%</span>
            </div>
            <Progress 
              value={calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData.paragraphCount)} 
              className="h-2" 
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              className="flex-1" 
              onClick={() => router.push(`/student/modules/${progress.moduleId}`)}
            >
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">Details</span>
            </Button>
            <Button 
              variant="default"
              size="sm"
              className="flex-1" 
              onClick={() => router.push(`/student/progress/${progress.moduleId}/reading`)}
            >
              <span className="hidden sm:inline">Continue Learning</span>
              <span className="sm:hidden">Continue</span>
            </Button>
          </div>
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
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-72" />
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
    <div className="space-y-4">
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