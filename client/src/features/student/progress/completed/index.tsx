'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnalyticsDashboard, useProgressMetrics } from '@/features/student/progress/AnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, BookOpen, ArrowUpDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { StudentProgressSchema } from '@/types/api';

// Helper function to calculate progress percentage
const calculateProgressPercentage = (current: number | null | undefined, total: number | null | undefined): number => {
  if (!current || !total) return 0;
  return Math.round((current / total) * 100);
};

// Sort options type for completed modules
type SortOption = 'recent' | 'oldest' | 'score-high' | 'score-low' | 'alphabetical';

interface CompletedModuleCardProps {
  progress: StudentProgressSchema;
  moduleTitle: string;
  moduleData?: { paragraphCount: number };
}

const CompletedModuleCard: React.FC<CompletedModuleCardProps> = ({ progress, moduleTitle, moduleData }) => {
  const router = useRouter();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{moduleTitle}</CardTitle>
          <Badge className="bg-success text-white flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden sm:inline">Completed</span>
          </Badge>
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
              {formatDistanceToNow(new Date(progress.completedAt || progress.updatedAt), { addSuffix: true })}
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

const CompletedProgressList: React.FC<{ sortBy: SortOption }> = ({ sortBy }) => {
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

  // Filter only completed modules
  const completedModules = progressList?.filter(progress => progress.completed) || [];
  
  const sortedModules = React.useMemo(() => {
    if (!completedModules.length) return [];
    
    return [...completedModules].sort((a, b) => {
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
  }, [completedModules, sortBy, moduleTitleMap]);

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
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground py-8">
          <p>No completed modules yet.</p>
          <p className="text-sm">Complete some modules to see them here!</p>
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

export function ProgressCompleteFeature() {
  const router = useRouter();
  const { data: progress = [] } = useMyProgressQuery();
  const progressMetrics = useProgressMetrics(progress);
  const [sortBy, setSortBy] = React.useState<SortOption>('recent');

  const handleTabChange = (value: string) => {
    if (value === 'in-progress') {
      router.push('/student/progress');
    } else {
      router.push('/student/progress/completed');
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
              value="completed"
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="in-progress">In Progress ({progressMetrics.inProgressCount})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({progressMetrics.completedCount})</TabsTrigger>
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
                    <SelectItem value="score-high">Score (High to Low)</SelectItem>
                    <SelectItem value="score-low">Score (Low to High)</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <CompletedProgressList sortBy={sortBy} />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
