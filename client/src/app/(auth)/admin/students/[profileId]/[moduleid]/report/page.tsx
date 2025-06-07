'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminStudentModuleDetailQuery } from '@/hooks/api/admin/progress/useAdminStudentModuleDetailQuery';
import { useAdminUpdateProgressMutation } from '@/hooks/api/admin/progress/useAdminUpdateProgressMutation';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { useAdminStudentQuery } from '@/hooks/api/admin/students/useAdminStudentQuery';
import { adminUpdateProgressSchema, AdminUpdateProgressFormInput } from '@/lib/schemas/progress';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertCircle, BookOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ReportPage = () => {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;
  const moduleId = params.moduleid as string;

  const { 
    data: student,
    isLoading: isLoadingStudent,
    error: studentError
  } = useAdminStudentQuery(profileId);

  const { 
    data: activeModules,
    isLoading: isLoadingModules,
    isError: isErrorModules,
    error: errorModules
  } = useActiveModulesQuery();

  const { 
    data: details, 
    isLoading: isLoadingDetails, 
    isError: isErrorDetails, 
    error: errorDetails 
  } = useAdminStudentModuleDetailQuery(profileId, moduleId);

  const updateMutation = useAdminUpdateProgressMutation();

  const { 
    register, 
    handleSubmit, 
    control,
    reset, 
    formState: { errors, isDirty }
  } = useForm<AdminUpdateProgressFormInput>({ 
    resolver: zodResolver(adminUpdateProgressSchema),
    values: { 
      score: details?.progress?.score ?? null, 
      teacherFeedback: details?.progress?.teacherFeedback ?? null,
      completed: details?.progress?.completed ?? false,
    },
    resetOptions: {
      keepDirtyValues: false,
    }
  });

  React.useEffect(() => {
    if (details) {
      reset({ 
        score: details.progress?.score ?? null, 
        teacherFeedback: details.progress?.teacherFeedback ?? null,
        completed: details.progress?.completed ?? false,
      });
    }
  }, [details, reset]);

  useEffect(() => {
    if (details?.progress) {
      const isMarkingComplete = details.progress.completed && 
                              details.progress.score !== null && 
                              details.progress.teacherFeedback !== null;

      if (!isMarkingComplete) {
        router.push(`/admin/students/${profileId}/${moduleId}/review`);
      }
    }
  }, [details, profileId, moduleId, router]);

  const onSubmit = (data: AdminUpdateProgressFormInput) => {
    if (!details?.progress?.id) {
      toast.error("Cannot update: No progress record found");
      return;
    }
    
    updateMutation.mutate(
      { progressId: details.progress.id, data },
      {
        onSuccess: (response) => {
          reset(data);
          toast.success("Progress updated successfully");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update progress");
        }
      }
    );
  };

  if (isLoadingModules || isLoadingDetails || isLoadingStudent) {
    return (
      <PageContainer>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (isErrorModules || isErrorDetails || studentError) {
    const error = errorModules || errorDetails || studentError;
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Report</AlertTitle>
          <AlertDescription>
            {error?.message || "Could not load report details."}
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const module = activeModules?.find(m => m.id === moduleId);
  const studentName = student?.fullName || 'Student';

  if (!module) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <BookOpen className="h-4 w-4" />
          <AlertTitle>Invalid Module</AlertTitle>
          <AlertDescription>
            The requested module does not exist.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumb 
          role="ADMIN"
          items={[
            { label: 'Students', href: '/admin/students' },
            { label: studentName, href: `/admin/students/${profileId}` },
            { label: `${module?.title} - report`, href: `/admin/students/${profileId}/${moduleId}/report` },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl sm:text-2xl font-bold break-words">
                  {module.title}
                </CardTitle>
                {details?.progress?.completed && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-1">
                  <Label htmlFor="score">Final Score (%)</Label>
                  <Input 
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    {...register("score", { valueAsNumber: true })} 
                    placeholder="0-100"
                    aria-describedby="score-error"
                  />
                  {errors.score && (
                    <p id="score-error" className="text-sm text-red-600">
                      {errors.score.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="teacherFeedback">Teacher Feedback</Label>
                  <Textarea 
                    id="teacherFeedback"
                    {...register("teacherFeedback")}
                    placeholder="Provide feedback for the student's work..."
                    className="min-h-[200px]"
                    aria-describedby="teacherFeedback-error"
                  />
                  {errors.teacherFeedback && (
                    <p id="teacherFeedback-error" className="text-sm text-red-600">
                      {errors.teacherFeedback.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="completed"
                    render={({ field }) => (
                      <Checkbox
                        id="completed"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-describedby="completed-error"
                      />
                    )}
                  />
                  <Label htmlFor="completed" className="cursor-pointer">
                    Mark as Completed
                  </Label>
                  {errors.completed && (
                    <p id="completed-error" className="text-sm text-red-600">
                      {errors.completed.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push(`/admin/students/${profileId}/${moduleId}/review`)}
                >
                  Back to Review
                </Button>
                <Button 
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ReportPage;