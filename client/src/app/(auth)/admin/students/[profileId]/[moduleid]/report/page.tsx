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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  BookOpen, 
  CheckCircle, 
  ArrowLeft,
  FileText,
  MessageSquare,
  TrendingUp,
  Calendar,
  User,
  Save,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
        <div className="space-y-6">
          {/* Header Skeleton */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex-grow space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isErrorModules || isErrorDetails || studentError) {
    const error = errorModules || errorDetails || studentError;
    return (
      <PageContainer>
        <Alert variant="destructive" className="max-w-2xl">
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
        <Alert variant="destructive" className="max-w-2xl">
          <BookOpen className="h-4 w-4" />
          <AlertTitle>Invalid Module</AlertTitle>
          <AlertDescription>
            The requested module does not exist.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const submissionsCount = details?.submissions?.length || 0;
  const isMarkingComplete = details?.progress?.completed && 
                          details?.progress?.score !== null && 
                          details?.progress?.teacherFeedback !== null;

  return (
    <TooltipProvider>
      <PageContainer>
        <div className="space-y-6">
          <Breadcrumb 
            role="ADMIN"
            items={[
              { label: 'Students', href: '/admin/students' },
              { label: studentName, href: `/admin/students/${profileId}` },
              { label: `${module?.title} - report` },
            ]}
          />

          {/* Enhanced Header Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="">
              <div className="flex flex-col space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <div className="flex-grow space-y-4 min-w-0">
                    {/* Title and Status Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-grow">
                        <div className="flex items-center gap-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] cursor-pointer hover:text-primary transition-colors">
                                {module.title}
                              </CardTitle>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-w-sm">
                              <DropdownMenuItem className="flex items-center gap-2 p-3">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Module Title:</span>
                                <span className="ml-auto">{module.title}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="leading-relaxed text-sm">
                          Final Report • {studentName}
                        </CardDescription>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge 
                          variant="default"
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        >
                          <div className="w-1.5 h-1.5 rounded-full mr-2 bg-green-500" />
                          Completed
                        </Badge>
                      </div>
                    </div>

                    {/* Enhanced Meta Information */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-4 border-t border-border/40">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Submissions:</span>
                        <span className="font-semibold">{submissionsCount} paragraphs</span>
                      </div>
                      
                                             {details?.progress?.score !== null && (
                         <div className="flex items-center gap-2 text-xs sm:text-sm">
                           <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                           <span className="text-muted-foreground">Score:</span>
                           <span className="font-semibold text-green-600">{details?.progress?.score}%</span>
                         </div>
                       )}
                      
                      {details?.progress?.completedAt && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-semibold">
                            {format(new Date(details.progress.completedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      
                      {details?.progress?.teacherFeedback && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                          <span className="text-green-600 font-semibold">Feedback Provided</span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                      <Button variant="outline" onClick={() => router.push(`/admin/students/${profileId}/${moduleId}/review`)} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Review
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Report Form Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                Edit Final Report
              </CardTitle>
              <CardDescription>
                Update the student's final score and feedback for this module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="score" className="text-sm font-medium">Final Score (%)</Label>
                    <Input 
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      {...register("score", { valueAsNumber: true })} 
                      placeholder="0-100"
                      aria-describedby="score-error"
                      className="h-11"
                    />
                    {errors.score && (
                      <p id="score-error" className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.score.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
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
                    <Label htmlFor="completed" className="cursor-pointer text-sm font-medium">
                      Mark as Completed
                    </Label>
                    {errors.completed && (
                      <p id="completed-error" className="text-sm text-destructive">
                        {errors.completed.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherFeedback" className="text-sm font-medium">Teacher Feedback</Label>
                  <Textarea 
                    id="teacherFeedback"
                    {...register("teacherFeedback")}
                    placeholder="Provide detailed feedback for the student's work..."
                    className="min-h-[200px] resize-none"
                    aria-describedby="teacherFeedback-error"
                  />
                  {errors.teacherFeedback && (
                    <p id="teacherFeedback-error" className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.teacherFeedback.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <Button 
                    type="submit"
                    disabled={!isDirty || updateMutation.isPending}
                    className="gap-2"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </TooltipProvider>
  );
};

export default ReportPage;