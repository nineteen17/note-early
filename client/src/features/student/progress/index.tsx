'use client';

import React from 'react';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BookOpen, Clock, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { StudentProgressSchema } from '@/types/api';

export function StudentProgressList() {
  const { data: progressList, isLoading: isLoadingProgress, error: progressError } = useMyProgressQuery();
  const { data: modules, isLoading: isLoadingModules, error: modulesError } = useAllActiveModulesQuery();

  // Create a map of module titles for quick lookup
  const moduleTitleMap = React.useMemo(() => {
    if (!modules) return new Map<string, string>();
    return modules.reduce((map, module) => {
      map.set(module.id, module.title);
      return map;
    }, new Map<string, string>());
  }, [modules]);

  if (isLoadingProgress || isLoadingModules) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

  if (!progressList || progressList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Progress</CardTitle>
          <CardDescription>Track your reading progress and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>You haven't started any modules yet.</p>
            <Button asChild className="mt-4">
              <Link href="/student/modules">Browse Modules</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Progress</CardTitle>
          <CardDescription>Track your reading progress and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {progressList.map((progress: StudentProgressSchema) => {
              const moduleTitle = moduleTitleMap.get(progress.moduleId) || 'Unknown Module';
              const isCompleted = progress.completed;
              const highestParagraph = progress.highestParagraphIndexReached || 0;
              const timeSpent = progress.timeSpentMinutes || 0;

              return (
                <div key={progress.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border">
                  <div className="space-y-1">
                    <h3 className="font-medium">{moduleTitle}</h3>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <GraduationCap className="mr-1 h-3 w-3" />
                        {highestParagraph} paragraphs read
                      </div>
                      {timeSpent > 0 && (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {timeSpent} minutes
                        </div>
                      )}
                      {progress.score !== null && (
                        <div className="flex items-center">
                          <BookOpen className="mr-1 h-3 w-3" />
                          Score: {progress.score}%
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started {formatDistanceToNow(new Date(progress.startedAt || progress.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isCompleted ? "default" : "secondary"}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </Badge>
                    <Button asChild size="sm">
                      <Link href={`/student/progress/${progress.moduleId}/details`}>
                        {isCompleted ? 'View Details' : 'Continue Reading'}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 