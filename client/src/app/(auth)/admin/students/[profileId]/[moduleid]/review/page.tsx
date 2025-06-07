'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminStudentModuleDetailQuery } from '@/hooks/api/admin/progress/useAdminStudentModuleDetailQuery';
import { useAdminUpdateProgressMutation } from '@/hooks/api/admin/progress/useAdminUpdateProgressMutation';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
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
import { AlertCircle, BookOpen, FileText, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAdminStudentQuery } from '@/hooks/api/admin/students/useAdminStudentQuery';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

export default function ModuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.profileId as string;
  const moduleId = params.moduleid as string;
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [isMarkingDialogOpen, setIsMarkingDialogOpen] = useState(false);

  console.log('ModuleDetailPage - Initial params:', { profileId, moduleId });

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

  const {
    data: moduleContent,
    isLoading: isLoadingModuleContent,
    isError: isErrorModuleContent,
    error: errorModuleContent
  } = useModuleQuery(moduleId);

  const updateMutation = useAdminUpdateProgressMutation();

  const markingForm = useForm<AdminUpdateProgressFormInput>({
    resolver: zodResolver(adminUpdateProgressSchema),
    defaultValues: {
      score: details?.progress?.score ?? 0,
      teacherFeedback: details?.progress?.teacherFeedback ?? '',
      completed: details?.progress?.completed ?? false,
    }
  });

  React.useEffect(() => {
    if (details) {
      markingForm.reset({ 
        score: details.progress?.score ?? 0, 
        teacherFeedback: details.progress?.teacherFeedback ?? '',
        completed: details.progress?.completed ?? false,
      });
    }
  }, [details, markingForm.reset]);

  const onSubmit = (data: AdminUpdateProgressFormInput) => {
    if (!details?.progress?.id) {
      toast.error('Progress ID not found');
      return;
    }

    updateMutation.mutate(
      { progressId: details.progress.id, data },
      {
        onSuccess: () => {
          setIsMarkingDialogOpen(false);
          markingForm.reset(data);
          toast.success('Marking completed successfully');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update marking');
        }
      }
    );
  };

  const handleClose = () => {
    console.log('ModuleDetailPage - Closing page, navigating back to:', `/admin/students/${profileId}`);
    router.push(`/admin/students/${profileId}`);
  };

  // Find the module in active modules
  const module = activeModules?.find(m => m.id === moduleId);
  console.log('ModuleDetailPage - Found module:', module);

  const isMarkingComplete = details?.progress?.score !== null || details?.progress?.teacherFeedback !== null;

  const handleStartMarking = () => {
    setIsMarkingDialogOpen(true);
  };

  const handleCloseMarking = () => {
    setIsMarkingDialogOpen(false);
  };

  if (isLoadingModules || isLoadingDetails || isLoadingModuleContent || isLoadingStudent) {
    console.log('ModuleDetailPage - Loading state');
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

  if (isErrorModules || isErrorDetails || isErrorModuleContent || studentError) {
    const error = errorModules || errorDetails || errorModuleContent || studentError;
    console.error('ModuleDetailPage - Error state:', error);
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Module</AlertTitle>
          <AlertDescription>
            {error?.message || "Could not load module details."}
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  // First check if the module exists
  if (!module) {
    console.error('ModuleDetailPage - Module not found:', { moduleId, availableModules: activeModules?.map(m => m.id) });
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

  const studentName = student?.fullName || 'Student';
  const submissionsCount = details?.submissions?.length || 0;
  const progressPercentage = moduleContent ? Math.round((submissionsCount / moduleContent.paragraphCount) * 100) : 0;

  console.log('ModuleDetailPage - Rendering main view:', {
    hasProgress: !!details?.progress,
    submissionsCount: details?.submissions?.length,
    formState: {
      isDirty: markingForm.formState.isDirty,
      errors: markingForm.formState.errors
    }
  });

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumb 
            role="ADMIN"
            items={[
              { label: 'Students', href: '/admin/students' },
              { label: student?.fullName || 'Student', href: `/admin/students/${profileId}` },
              { label: `${module?.title} - review` || 'Module', href: `/admin/students/${profileId}/${moduleId}/review` },
            ]}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl sm:text-2xl font-bold break-words">
                    {module.title}
                  </CardTitle>
                  <Badge variant={isMarkingComplete ? "success" : "secondary"}>
                    {isMarkingComplete ? "Marking Complete" : "Marking Pending"}
                  </Badge>
                </div>
                
                {/* Progress Information */}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                      <span>{submissionsCount} of {moduleContent?.paragraphCount || 0} paragraphs submitted</span>
                      <span className="hidden sm:inline text-xs">•</span>
                      <span>Student: {studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {details?.progress?.completed && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                          ✓ Complete
                        </span>
                      )}
                      <span className={`text-sm font-medium ${details?.progress?.completed ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        {progressPercentage}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className={`h-2 transition-colors ${
                      details?.progress?.completed 
                        ? 'bg-green-100 dark:bg-green-950/20' 
                        : 'bg-purple-100 dark:bg-purple-950/20'
                    }`}
                    style={{
                      '--progress-foreground': details?.progress?.completed 
                        ? 'hsl(142, 76%, 36%)' 
                        : 'hsl(262, 83%, 58%)'
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!details?.progress && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Module Not Started</AlertTitle>
                <AlertDescription>
                  This student has not started this module yet.
                </AlertDescription>
              </Alert>
            )}

            {details?.progress && (
              <>
                {/* Module Content and Submissions */}
                <div className="space-y-6">
                  {/* Action Button - Moved up */}
                  <div className="flex justify-end">
                    {isMarkingComplete ? (
                      <Button onClick={() => router.push(`/admin/students/${profileId}/${moduleId}/report`)}>
                        View Report
                      </Button>
                    ) : (
                      <Button onClick={handleStartMarking}>
                        Mark Work
                      </Button>
                    )}
                  </div>

                  {/* Current Paragraph Content */}
                  {moduleContent && (
                    <div className="space-y-4">
                      <div className="border rounded-md p-4 bg-muted/20">
                        <div className="text-sm">
                          <p className="font-medium">Paragraph {currentParagraphIndex + 1} of {moduleContent?.paragraphCount || 0}</p>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                            {moduleContent.structuredContent[currentParagraphIndex]?.text}
                          </p>
                        </div>
                      </div>

                      {/* Student Submission for Current Paragraph */}
                      <div className="border rounded-md p-4 bg-muted/20">
                        {details.submissions[currentParagraphIndex] ? (
                          <div className="text-sm space-y-4">
                            <div>
                              <p className="font-medium">Paragraph Summary:</p>
                              <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                                {details.submissions[currentParagraphIndex].paragraphSummary}
                              </p>
                            </div>
                            {details.submissions[currentParagraphIndex].cumulativeSummary && (
                              <div>
                                <p className="font-medium">Cumulative Summary:</p>
                                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {details.submissions[currentParagraphIndex].cumulativeSummary}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Submitted: {format(new Date(details.submissions[currentParagraphIndex].submittedAt), 'Pp')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No submission for this paragraph yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentParagraphIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentParagraphIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous Paragraph
                    </Button>
                    <span className="text-sm font-medium">
                      Paragraph {currentParagraphIndex + 1} of {moduleContent?.paragraphCount || 0}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentParagraphIndex(prev => Math.min((moduleContent?.paragraphCount || 1) - 1, prev + 1))}
                      disabled={currentParagraphIndex === (moduleContent?.paragraphCount || 1) - 1}
                    >
                      Next Paragraph
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isMarkingDialogOpen} onOpenChange={setIsMarkingDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mark Student Work</DialogTitle>
            </DialogHeader>
            <Form {...markingForm}>
              <form onSubmit={markingForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={markingForm.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          max={100} 
                          value={field.value ?? 0}
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={markingForm.control}
                  name="teacherFeedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your feedback for the student..."
                          className="min-h-[100px]"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={markingForm.control}
                  name="completed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as Completed
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseMarking}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Marking"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
