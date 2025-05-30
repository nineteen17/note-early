'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnalyticsDashboard, useProgressMetrics } from '@/features/student/progress/AnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Clock, CheckCircle2, AlertCircle, BookOpen, GraduationCap, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { StudentProgressSchema } from '@/types/api';

// Add this helper function at the top level
const calculateProgressPercentage = (current: number | null | undefined, total: number | null | undefined): number => {
  if (!current || !total) return 0;
  return Math.round((current / total) * 100);
};

// Sort options type
type SortOption = 'recent' | 'oldest' | 'progress-high' | 'progress-low' | 'alphabetical';

interface ModuleCardProps {
  progress: StudentProgressSchema;
  moduleTitle: string;
  moduleData?: { paragraphCount: number }; // Add module data for accurate displays
}

const InProgressModuleCard: React.FC<ModuleCardProps> = ({ progress, moduleTitle, moduleData }) => {
  const router = useRouter();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{moduleTitle}</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">In Progress</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {Math.min(progress.highestParagraphIndexReached || 0, moduleData?.paragraphCount || 0)} of {moduleData?.paragraphCount || 'N/A'} paragraphs completed
                </span>
                <span className="sm:hidden">
                  {Math.min(progress.highestParagraphIndexReached || 0, moduleData?.paragraphCount || 0)}/{moduleData?.paragraphCount || 'N/A'}
                </span>
              </span>
              {progress.timeSpentMinutes ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{progress.timeSpentMinutes} minutes spent</span>
                  <span className="sm:hidden">{progress.timeSpentMinutes}m</span>
                </span>
              ) : null}
            </div>
            <span className="text-xs sm:text-sm">
              Started {formatDistanceToNow(new Date(progress.startedAt || progress.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData?.paragraphCount)}%</span>
            </div>
            <Progress 
              value={calculateProgressPercentage(progress.highestParagraphIndexReached, moduleData?.paragraphCount)} 
              variant="in-progress"
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
              size="sm"
              className="flex-1" 
              onClick={() => router.push(`/student/progress/${progress.moduleId}/reading`)}
            >
              <span className="hidden sm:inline">Continue Reading</span>
              <span className="sm:hidden">Continue</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CompletedModuleCard: React.FC<ModuleCardProps> = ({ progress, moduleTitle, moduleData }) => {
  const router = useRouter();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{moduleTitle}</CardTitle>
          <Badge className="bg-[#4BAE4F] text-white flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                {Math.min(progress.highestParagraphIndexReached || 0, moduleData?.paragraphCount || 0)} of {moduleData?.paragraphCount || 'N/A'} paragraphs completed
              </span>
              {progress.timeSpentMinutes ? (
                <span>{progress.timeSpentMinutes} minutes spent</span>
              ) : null}
            </div>
            <span>Completed {formatDistanceToNow(new Date(progress.completedAt || progress.updatedAt), { addSuffix: true })}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Score</span>
              <span>{progress.score || 0}%</span>
            </div>
            <Progress 
              value={progress.score || 0} 
              variant="completed"
              className="h-2" 
            />
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push(`/student/progress/${progress.moduleId}/report`)}
          >
            View Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const StudentProgressList: React.FC<{ showCompleted?: boolean; sortBy: SortOption }> = ({ showCompleted = false, sortBy }) => {
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
    if (!modules) return new Map<string, { paragraphCount: number }>();
    return modules.reduce((map, module) => {
      map.set(module.id, { paragraphCount: module.paragraphCount });
      return map;
    }, new Map<string, { paragraphCount: number }>());
  }, [modules]);

  // Filter and sort modules
  const filtered = progressList?.filter(progress => {
    if (showCompleted) {
      return progress.completed;
    } else {
      return !progress.completed;
    }
  });
  
  const sorted = React.useMemo(() => {
    if (!filtered) return [];
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'progress-high':
          if (showCompleted) {
            return (b.score || 0) - (a.score || 0);
          } else {
            return (b.highestParagraphIndexReached || 0) - (a.highestParagraphIndexReached || 0);
          }
        case 'progress-low':
          if (showCompleted) {
            return (a.score || 0) - (b.score || 0);
          } else {
            return (a.highestParagraphIndexReached || 0) - (b.highestParagraphIndexReached || 0);
          }
        case 'alphabetical':
          const titleA = moduleTitleMap.get(a.moduleId) || '';
          const titleB = moduleTitleMap.get(b.moduleId) || '';
          return titleA.localeCompare(titleB);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [filtered, showCompleted, sortBy, moduleTitleMap]);

  if (isLoadingProgress || isLoadingModules) {
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
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-8">
          {showCompleted ? (
            <>
              <p>No completed modules yet.</p>
              <p className="text-sm">Complete some modules to see them here!</p>
            </>
          ) : (
            <>
              <p>No modules in progress.</p>
              <Button asChild className="mt-4">
                <Link href="/student/modules">Start a Module</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((progress: StudentProgressSchema) => {
        const moduleTitle = moduleTitleMap.get(progress.moduleId) || 'Unknown Module';
        const moduleData = moduleDataMap.get(progress.moduleId);
        
        return showCompleted ? (
          <CompletedModuleCard 
            key={progress.id} 
            progress={progress} 
            moduleTitle={moduleTitle} 
            moduleData={moduleData}
          />
        ) : (
          <InProgressModuleCard 
            key={progress.id} 
            progress={progress} 
            moduleTitle={moduleTitle} 
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
  const [sortBy, setSortBy] = React.useState<SortOption>('recent');

  const handleTabChange = (value: string) => {
    if (value === 'completed') {
      router.push('/student/progress/completed');
    } else {
      router.push('/student/progress');
    }
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader 
          title="My Progress"
          description="Track your reading progress and module completion"
        />
        
        <AnalyticsDashboard metrics={progressMetrics} />
        
        <Card>
          <CardHeader>
            <CardTitle>Module Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs 
              value="in-progress"
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="in-progress"  >In Progress ({progressMetrics.inProgressCount})</TabsTrigger>
                <TabsTrigger value="completed" >Completed ({progressMetrics.completedCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="progress-high">Progress (High to Low)</SelectItem>
                    <SelectItem value="progress-low">Progress (Low to High)</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <StudentProgressList showCompleted={false} sortBy={sortBy} />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
} 