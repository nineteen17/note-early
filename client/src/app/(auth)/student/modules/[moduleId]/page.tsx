'use client';

import React from 'react';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useStartModuleMutation } from '@/hooks/api/student/progress/useStartModuleMutation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { use } from 'react';

// Helper function to calculate progress percentage
const calculateProgressPercentage = (current: number | null | undefined, total: number): number => {
  if (!current || current <= 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
};

interface ModuleDetailsPageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default function ModuleDetailsPage({ params }: ModuleDetailsPageProps) {
  const { moduleId } = use(params);
  const router = useRouter();
  const { data: module, isLoading: isModuleLoading, error: moduleError } = useModuleQuery(moduleId);
  const { data: progressDetails, isLoading: isProgressLoading } = useStudentProgressDetailsQuery(moduleId);
  const startModuleMutation = useStartModuleMutation();

  const handleStartModule = async () => {
    try {
      await startModuleMutation.mutateAsync({ moduleId });
      // Navigate to the progress details page
      router.push(`/student/progress/${moduleId}/details`);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to start module:', error);
    }
  };

  if (isModuleLoading || isProgressLoading) {
    return <StudentSkeleton />;
  }

  if (moduleError || !module) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {moduleError?.message || 'Failed to load module details. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const progress = progressDetails?.progress;
  const progressPercentage = calculateProgressPercentage(
    progress?.highestParagraphIndexReached,
    module.paragraphCount
  );

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{module.title}</CardTitle>
              <CardDescription>
                Level: {module.level} | Genre: {module.genre} | Paragraphs: {module.paragraphCount}
              </CardDescription>
            </div>
            {progress && (
              <Badge variant={progress.completed ? "default" : "secondary"}>
                {progress.completed ? 'Completed' : 'In Progress'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {module.imageUrl && (
            <img
              src={module.imageUrl}
              alt={`Cover for ${module.title}`}
              className="aspect-video w-full rounded-md object-cover"
              width={800}
              height={450}
            />
          )}
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed">{module.description}</p>
          </div>

          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progress.highestParagraphIndexReached} of {module.paragraphCount} paragraphs completed
              </p>
            </div>
          )}

          <div className="flex justify-end">
            {progress ? (
              <Button asChild>
                <a href={`/student/progress/${moduleId}/details`}>
                  {progress.completed ? 'View Details' : 'Continue Reading'}
                </a>
              </Button>
            ) : (
              <Button
                onClick={handleStartModule}
                disabled={startModuleMutation.isPending}
              >
                {startModuleMutation.isPending ? 'Starting...' : 'Start Module'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 