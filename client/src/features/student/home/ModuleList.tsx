'use client';

import React from 'react';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import type { ReadingModuleDTO } from '@/types/api';

// Helper function to calculate progress percentage
const calculateProgressPercentage = (current: number | null | undefined, total: number): number => {
  if (!current || current <= 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
};

export function ModuleList() {
  const { data: modules, isLoading: isLoadingModules, isError: isModulesError, error: modulesError } = useAllActiveModulesQuery();
  const { data: progressList, isLoading: isLoadingProgress } = useMyProgressQuery();

  // Create a map of progress records for quick lookup
  const progressMap = React.useMemo(() => {
    if (!progressList) return new Map<string, any>();
    return progressList.reduce((map, progress) => {
      map.set(progress.moduleId, progress);
      return map;
    }, new Map<string, any>());
  }, [progressList]);

  if (isLoadingModules || isLoadingProgress) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (isModulesError) {
    console.error("ModuleList: Failed to load active modules.", modulesError);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Could not load available reading modules. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-6 border rounded-lg">
        No reading modules available at the moment.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => {
        const progress = progressMap.get(module.id);
        const isInProgress = progress && !progress.completed;
        const isCompleted = progress?.completed;
        const progressPercentage = calculateProgressPercentage(
          progress?.highestParagraphIndexReached,
          module.paragraphCount
        );

        return (
          <Card key={module.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>
                Level: {module.level} | Genre: {module.genre} | Paragraphs: {module.paragraphCount}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {module.imageUrl && (
                <img
                  src={module.imageUrl}
                  alt={`Cover for ${module.title}`}
                  className="aspect-video w-full rounded-md object-cover mb-4"
                  width={300}
                  height={169}
                />
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {module.description || 'No description available.'}
              </p>
              {progress && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={isCompleted ? "default" : "secondary"}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {progressPercentage}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {progress.highestParagraphIndexReached} of {module.paragraphCount} paragraphs completed
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild size="sm">
                <Link href={`/student/modules/${module.id}`}>
                  {progress ? (isCompleted ? 'View Details' : 'Continue Reading') : 'View Module'}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 