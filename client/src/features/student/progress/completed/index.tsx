'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnalyticsDashboard, useProgressMetrics } from '@/features/student/progress/AnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, BookOpen, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { StudentProgressSchema } from '@/types/api';
import { ProgressFilters as ProgressFiltersComponent, type ProgressFilters as ProgressFiltersType, type SortOption } from '../ProgressFilters';

// Helper function to calculate progress percentage
const calculateProgressPercentage = (current: number | null | undefined, total: number | null | undefined): number => {
  if (!current || !total) return 0;
  return Math.round((current / total) * 100);
};

interface CompletedModuleCardProps {
  progress: StudentProgressSchema;
  moduleTitle: string;
  moduleData?: { 
    paragraphCount: number;
    description?: string;
  };
}

const CompletedModuleCard: React.FC<CompletedModuleCardProps> = ({ progress, moduleTitle, moduleData }) => {
  const router = useRouter();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{moduleTitle}</h3>
              <Badge className="bg-success text-primary-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Completed</span>
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {moduleData?.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">
                {Math.min(progress.highestParagraphIndexReached || 0, moduleData?.paragraphCount || 0)} of {moduleData?.paragraphCount || 'N/A'} paragraphs
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
              Completed: {formatDistanceToNow(new Date(progress.completedAt || progress.updatedAt), { addSuffix: true })}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Score</span>
              <span>{progress.score || 0}%</span>
            </div>
            <Progress 
              value={progress.score || 0} 
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
              onClick={() => router.push(`/student/progress/${progress.moduleId}/report`)}
            >
              <span className="hidden sm:inline">View Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CompletedProgressList: React.FC<{ sortBy: SortOption; searchQuery?: string; levels?: number[] }> = ({ 
  sortBy,
  searchQuery = '',
  levels
}) => {
  const { data: progressList, isLoading: isLoadingProgress, error: progressError } = useMyProgressQuery();
  const { data: modules, isLoading: isLoadingModules, error: modulesError } = useAllActiveModulesQuery();
  
  // Create maps for module data lookup
  const moduleTitleMap = React.useMemo(() => {
    if (!modules) return new Map<string, string>();
    return modules.reduce((map, module) => {
      map.set(module.id, module.title);
      return map;
    }, new Map<string, string>());
  }, [modules]);

  const moduleDataMap = React.useMemo(() => {
    if (!modules) return new Map<string, { paragraphCount: number; description?: string }>();
    return modules.reduce((map, module) => {
      map.set(module.id, { 
        paragraphCount: module.paragraphCount,
        description: module.description
      });
      return map;
    }, new Map<string, { paragraphCount: number; description?: string }>());
  }, [modules]);

  // Filter only completed modules
  const completedModules = progressList?.filter(progress => progress.completed) || [];
  
  // Apply search filter if searchQuery exists
  const filteredModules = React.useMemo(() => {
    if (!searchQuery && (!levels || levels.length === 0)) return completedModules;
    
    return completedModules.filter(progress => {
      const moduleTitle = moduleTitleMap.get(progress.moduleId) || '';
      const moduleData = moduleDataMap.get(progress.moduleId);
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const titleMatch = moduleTitle.toLowerCase().includes(searchLower);
        if (!titleMatch) return false;
      }
      
      // Level filter
      if (levels && levels.length > 0) {
        const module = modules?.find(m => m.id === progress.moduleId);
        if (!module || !levels.includes(module.level)) return false;
      }
      
      return true;
    });
  }, [completedModules, searchQuery, levels, moduleTitleMap, moduleDataMap, modules]);
  
  const sortedModules = React.useMemo(() => {
    if (!filteredModules.length) return [];
    
    return [...filteredModules].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.completedAt || a.updatedAt).getTime() - new Date(b.completedAt || b.updatedAt).getTime();
        case 'score-high':
          return (b.score || 0) - (a.score || 0);
        case 'score-low':
          return (a.score || 0) - (b.score || 0);
        case 'alphabetical':
          const titleA = moduleTitleMap.get(a.moduleId) || '';
          const titleB = moduleTitleMap.get(b.moduleId) || '';
          return titleA.localeCompare(titleB);
        default:
          return 0;
      }
    });
  }, [filteredModules, sortBy, moduleTitleMap]);

  const isLoading = isLoadingProgress || isLoadingModules;
  const error = progressError || modulesError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error?.message || "Failed to load progress data. Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!sortedModules.length) {
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
          <h3 className="text-lg font-semibold mb-2">No Completed Modules</h3>
          <p className="text-muted-foreground">
            Complete some modules to see them here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedModules.map((progress) => (
        <CompletedModuleCard
          key={progress.id}
          progress={progress}
          moduleTitle={moduleTitleMap.get(progress.moduleId) || `Module ${progress.moduleId.substring(0, 8)}...`}
          moduleData={moduleDataMap.get(progress.moduleId)}
        />
      ))}
    </div>
  );
};

const STORAGE_KEY = 'student-progress-completed-filters';

export function ProgressCompleteFeature() {
  const router = useRouter();
  const { data: progress = [] } = useMyProgressQuery();
  const progressMetrics = useProgressMetrics(progress);
  const [filterState, setFilterState] = useState<ProgressFiltersType>(() => {
    if (typeof window === 'undefined') return { sort: 'recent' };
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { sort: 'recent' };
  });

  const handleTabChange = (value: string) => {
    if (value === 'in-progress') {
      router.push('/student/progress');
    } else {
      router.push('/student/progress/completed');
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
          value="completed"
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

        <CompletedProgressList 
          sortBy={filterState.sort} 
          searchQuery={filterState.search}
          levels={filterState.levels}
        />
      </div>
    </PageContainer>
  );
}
