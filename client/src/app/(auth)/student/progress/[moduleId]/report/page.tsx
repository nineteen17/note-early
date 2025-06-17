'use client';

import React from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useModuleQuery } from '@/hooks/api/readingModules/useModuleQuery';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  BookOpen,
  AlignLeft
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ModuleReportPageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default function ModuleReportPage({ params }: ModuleReportPageProps) {
  const { moduleId } = use(params);
  const router = useRouter();
  const { data: progressDetails, isLoading: isLoadingProgress, error: progressError } = useStudentProgressDetailsQuery(moduleId);
  const { data: module, isLoading: isLoadingModule } = useModuleQuery(moduleId);
  const { data: overallProgress, isLoading: isLoadingOverallProgress } = useMyProgressQuery();
  const { data: allModules, isLoading: isLoadingAllModules } = useAllActiveModulesQuery();

  if (isLoadingProgress || isLoadingModule) {
    return (
      <PageContainer>
        <div className="space-y-6">
          {/* Breadcrumb skeleton */}
          <Skeleton className="h-5 w-64" />
          
          {/* Header card skeleton */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Cards skeleton */}
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-2 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-20" />
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-3">
                    <Skeleton className="h-12 w-20 mx-auto" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <div className="flex justify-center sm:justify-end pt-4">
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!progressDetails?.progress || !module) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Report</AlertTitle>
          <AlertDescription>
            Could not load the module report. Please try again later.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const progress = progressDetails.progress;
  
  // Route guard for incomplete modules
  if (!progress.completed) {
    router.push(`/student/progress/${moduleId}/reading`);
    return null;
  }

  const { submissions } = progressDetails;
  const completionDate = progress.completedAt ? new Date(progress.completedAt) : null;
  const timeSpent = progress.timeSpentMinutes || 0;

  return (
    <TooltipProvider>
      <PageContainer>
        <div className="space-y-6">
          <Breadcrumb
            items={[
              { label: 'Progress', href: '/student/progress' },
              { label: 'Completed', href: '/student/progress/completed' },
              { label: module.title, href: '#' },
              { label: 'Report', href: '#' },
            ]}
          />

          {/* Header Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer flex-1">
                        <CardTitle className="text-2xl font-bold leading-tight line-clamp-2 pr-2 sm:pr-0">
                          {module.title} - Report
                        </CardTitle>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{module.title}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Badge className="bg-success text-white flex-shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                
                {/* Module Metadata Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Level {module.level}
                  </Badge>
                  
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                    <AlignLeft className="h-3 w-3 mr-1" />
                    {module.paragraphCount} paragraphs
                  </Badge>
                  
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800">
                    <Clock className="h-3 w-3 mr-1" />
                    {timeSpent || module.paragraphCount * 2} min
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Cards Grid */}
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Progress Overview Card */}
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      Progress Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Progress value={100} variant="completed" className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">Module completed successfully</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-sm">Time Spent</span>
                        <div className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeSpent}m
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-sm">Completed</span>
                        <div className="font-medium text-sm">
                          {completionDate ? format(completionDate, 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Card */}
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Star className="h-4 w-4 text-yellow-600" />
                      </div>
                      Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-3">
                      {progress.score !== null && progress.score !== undefined ? (
                        <>
                          <p className="text-3xl font-bold text-success">{progress.score}%</p>
                          <Progress value={progress.score} variant="completed" className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            {progress.score >= 80 ? 'Excellent work!' : 
                             progress.score >= 60 ? 'Good job!' : 
                             'Keep practicing!'}
                          </p>
                        </>
                      ) : (
                        <div className="py-4">
                          <p className="text-xl font-medium text-muted-foreground">Awaiting Score</p>
                          <p className="text-sm text-muted-foreground mt-1">Your score will be available soon</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feedback Card */}
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    Teacher Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progress.teacherFeedback ? (
                    <div className="space-y-3">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm leading-relaxed">{progress.teacherFeedback}</p>
                      </div>
                      {progress.teacherFeedbackAt && (
                        <p className="text-xs text-muted-foreground">
                          Feedback provided {formatDistanceToNow(new Date(progress.teacherFeedbackAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground italic">No feedback provided yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Action Button */}
            <div className="flex justify-center sm:justify-end pt-4">
              <Button 
                onClick={() => router.push(`/student/progress/${moduleId}/reading`)}
                size="lg"
                className="w-full sm:w-auto min-w-[200px]"
              >
                Review Module & Submissions
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </TooltipProvider>
  );
} 