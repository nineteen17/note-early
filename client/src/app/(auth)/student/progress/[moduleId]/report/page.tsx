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
          <Skeleton className="h-8 w-3/4" />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
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
    <PageContainer>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Breadcrumb
            items={[
              { label: 'Progress', href: '/student/progress' },
              { label: 'Completed', href: '/student/progress/completed' },
              { label: module.title, href: '#' },
              { label: 'Report', href: '#' },
            ]}
            className="flex-wrap"
          />
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{module.title}</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      Level {module.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlignLeft className="h-4 w-4" />
                      {module.paragraphCount} paragraphs
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {module.paragraphCount * 2} minutes
                    </span>
                  </div>
                </CardDescription>
              </div>
              <Badge className="bg-[#4BAE4F] text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Progress Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Progress Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">100%</span>
                    </div>
                    <Progress value={100} variant="completed" className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Time Spent</span>
                      </div>
                      <p className="text-lg font-medium">{timeSpent} minutes</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Completed</span>
                      </div>
                      <p className="text-lg font-medium">
                        {completionDate ? format(completionDate, 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    {progress.score !== null && progress.score !== undefined ? (
                      <>
                        <p className="text-4xl font-bold text-primary">{progress.score}%</p>
                        <div className="space-y-1">
                          <Progress value={progress.score} variant="completed" className="h-3" />
                          <p className="text-sm text-muted-foreground">
                            {progress.score >= 80 ? 'Excellent work!' : 
                             progress.score >= 60 ? 'Good job!' : 
                             'Keep practicing!'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="py-4">
                        <p className="text-2xl font-medium text-muted-foreground">Awaiting Score</p>
                        <p className="text-sm text-muted-foreground mt-1">Your score will be available soon</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feedback Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress.teacherFeedback ? (
                  <div className="space-y-2">
                    <p className="text-sm">{progress.teacherFeedback}</p>
                    {progress.teacherFeedbackAt && (
                      <p className="text-xs text-muted-foreground">
                        Feedback provided {formatDistanceToNow(new Date(progress.teacherFeedbackAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No feedback provided yet</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button asChild>
                <a href={`/student/progress/${moduleId}/reading`}>
                  Review Module & Submissions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
} 