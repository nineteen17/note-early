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
  FileText, 
  ArrowLeft, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  User,
  Clock,
  TrendingUp,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  Edit,
  Eye
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

export default function ModuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.profileId as string;
  const moduleId = params.moduleid as string;
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [isMarkingDialogOpen, setIsMarkingDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'paragraph' | 'submission'>('paragraph');

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

  const studentName = student?.fullName || 'Student';
  const submissionsCount = details?.submissions?.length || 0;
  const totalParagraphs = moduleContent?.paragraphCount || 0;
  const isModuleComplete = submissionsCount === totalParagraphs && totalParagraphs > 0;
  
  // Fix marking logic: A module is only truly marked complete if:
  // 1. It has been marked (score or feedback exists)
  // 2. The student has completed ALL current paragraphs (in case module was edited)
  // 3. The progress is explicitly marked as completed
  const isMarkingComplete = isModuleComplete && 
                          details?.progress?.completed === true &&
                          (details?.progress?.score !== null && details?.progress?.score !== undefined || 
                           (details?.progress?.teacherFeedback !== null && details?.progress?.teacherFeedback !== undefined && details?.progress?.teacherFeedback.trim() !== ''));

  console.log('ModuleDetailPage - Rendering main view:', {
    hasProgress: !!details?.progress,
    submissionsCount: details?.submissions?.length,
    totalParagraphs,
    isModuleComplete,
    isMarkingComplete,
    progressCompleted: details?.progress?.completed,
    formState: {
      isDirty: markingForm.formState.isDirty,
      errors: markingForm.formState.errors
    }
  });

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

  if (isErrorModules || isErrorDetails || isErrorModuleContent || studentError) {
    const error = errorModules || errorDetails || errorModuleContent || studentError;
    console.error('ModuleDetailPage - Error state:', error);
    return (
      <PageContainer>
        <Alert variant="destructive" className="max-w-2xl">
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

  return (
    <TooltipProvider>
      <PageContainer>
        <div className="space-y-6">
          <Breadcrumb 
            role="ADMIN"
            items={[
              { label: 'Students', href: '/admin/students' },
              { label: student?.fullName || 'Student', href: `/admin/students/${profileId}` },
              { label: `${module?.title} - review` || 'Module' },
            ]}
          />

          {/* Enhanced Header Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-grow">
                  <div className="flex items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight truncate max-w-[300px] sm:max-w-[500px] md:max-w-[600px] cursor-pointer hover:text-primary transition-colors">
                          {module.title}
                        </CardTitle>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-w-sm">
                        <DropdownMenuItem className="flex items-center gap-2 p-3">
                          <span className="ml-auto">{module.title}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-sm">
                    Student Review • {studentName}
                  </CardDescription>
                </div>
                
                {/* Compact Meta Information */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{submissionsCount}/{totalParagraphs}</span>
                  </div>
                  
                  <Badge 
                    variant={isMarkingComplete ? "default" : !isModuleComplete ? "destructive" : "secondary"}
                    className={cn(
                      "text-xs",
                      isMarkingComplete 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : !isModuleComplete
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    )}
                  >
                    {isMarkingComplete ? "Marked" : !isModuleComplete ? "Incomplete" : "Ready to Mark"}
                  </Badge>
                  
                  {isMarkingComplete ? (
                    <Button size="sm" onClick={() => router.push(`/admin/students/${profileId}/${moduleId}/report`)} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Report
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleStartMarking} 
                          className="gap-2"
                          disabled={!isModuleComplete}
                        >
                          <Edit className="h-4 w-4" />
                          Mark
                        </Button>
                      </TooltipTrigger>
                      {!isModuleComplete && (
                        <TooltipContent>
                          <p>Student must complete all {totalParagraphs} submissions before marking</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {!details?.progress && (
            <Alert variant="destructive" className="max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Module Not Started</AlertTitle>
              <AlertDescription>
                This student has not started this module yet.
              </AlertDescription>
            </Alert>
          )}



          {details?.progress && (
            <div className="flex flex-col h-[calc(100vh-280px)]">
              {/* Desktop View - Side by Side Cards */}
              <div className="hidden lg:block flex-1 min-h-0">
                <div className="grid gap-6 lg:grid-cols-2 h-full">
                  {/* Original Paragraph Content */}
                  {moduleContent && (
                    <Card className="shadow-md overflow-hidden flex flex-col h-full">
                     <CardHeader className="flex-shrink-0 pb-3 border-b">
                       <div className="flex items-center justify-between">
                         <CardTitle className="flex items-center gap-2 text-lg">
                           <div className="p-2 bg-primary/10 rounded-lg">
                             <BookOpen className="h-4 w-4 text-primary" />
                           </div>
                           Paragraph {currentParagraphIndex + 1}
                         </CardTitle>
                         
                         {/* Navigation Controls */}
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <span className="text-sm font-medium">
                               {currentParagraphIndex + 1} of {totalParagraphs}
                             </span>
                             <div className="flex items-center gap-1">
                               {Array.from({ length: totalParagraphs || 0 }, (_, i) => (
                                 <button
                                   key={i}
                                   onClick={() => setCurrentParagraphIndex(i)}
                                   className={cn(
                                     "w-2.5 h-2.5 rounded-full transition-colors",
                                     i === currentParagraphIndex 
                                       ? "bg-accent" 
                                       : details?.submissions?.[i]
                                       ? "bg-green-500"
                                       : "bg-muted-foreground/30"
                                   )}
                                   title={`Paragraph ${i + 1}${details?.submissions?.[i] ? ' (submitted)' : ''}`}
                                 />
                               ))}
                             </div>
                           </div>
                           
                           <div className="flex items-center gap-1 pl-4">
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => setCurrentParagraphIndex(prev => Math.max(0, prev - 1))}
                               disabled={currentParagraphIndex === 0}
                             >
                               <ChevronLeft className="h-4 w-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => setCurrentParagraphIndex(prev => Math.min((moduleContent?.paragraphCount || 1) - 1, prev + 1))}
                               disabled={currentParagraphIndex === (moduleContent?.paragraphCount || 1) - 1}
                             >
                               <ChevronRight className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                       </div>
                     </CardHeader>
                       <CardContent className="flex-1 min-h-0 pb-4">
                         <Textarea
                           value={moduleContent.structuredContent[currentParagraphIndex]?.text || ''}
                           className="h-full resize-none"
                           readOnly
                         />
                      </CardContent>
                   </Card>
                 )}

                 {/* Student Submission */}
                 <Card className="shadow-md overflow-hidden flex flex-col h-full">
                   <CardHeader className="flex-shrink-0 pb-3 border-b">
                     <CardTitle className="flex items-center gap-2 text-lg">
                       <div className="p-2 bg-blue-500/10 rounded-lg">
                         <User className="h-4 w-4 text-blue-600" />
                       </div>
                       Student Submission
                       {details?.submissions?.[currentParagraphIndex] && (
                         <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                           Submitted
                         </Badge>
                       )}
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="flex-1 min-h-0 pb-4">
                     <div className="h-full overflow-auto">
                       {details?.submissions?.[currentParagraphIndex] ? (
                         <div className="space-y-4">
                           <div>
                             <h4 className="font-medium text-sm mb-2">Paragraph Summary:</h4>
                             <div className="bg-muted/30 rounded-lg p-3">
                               <Textarea
                                 value={details?.submissions?.[currentParagraphIndex]?.paragraphSummary || ''}
                                 className="min-h-[180px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                 readOnly
                               />
                             </div>
                           </div>
                           <div>
                             <h4 className="font-medium text-sm mb-2">Cumulative Summary:</h4>
                             <div className="bg-muted/30 rounded-lg p-3">
                               <Textarea
                                 value={details?.submissions?.[currentParagraphIndex]?.cumulativeSummary || 'No cumulative summary provided.'}
                                 className="min-h-[180px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                 readOnly
                               />
                             </div>
                           </div>
                         </div>
                       ) : (
                         <div className="h-full flex items-center justify-center text-muted-foreground">
                           <div className="text-center">
                             <p className="text-sm italic">No submission for this paragraph yet.</p>
                           </div>
                         </div>
                       )}
                     </div>
                   </CardContent>
                 </Card>
               </div>
              </div>

              {/* Mobile View - Tabbed Interface */}
              <div className="lg:hidden flex-1 min-h-0">
                <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as 'paragraph' | 'submission')} className="h-full flex flex-col">
                  <div className="flex-shrink-0 space-y-3">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="paragraph">Original Text</TabsTrigger>
                      <TabsTrigger value="submission">Student Work</TabsTrigger>
                    </TabsList>
                    
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {currentParagraphIndex + 1} of {totalParagraphs}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalParagraphs || 0 }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentParagraphIndex(i)}
                              className={cn(
                                "w-2.5 h-2.5 rounded-full transition-colors",
                                i === currentParagraphIndex 
                                  ? "bg-accent" 
                                  : details?.submissions?.[i]
                                  ? "bg-green-500"
                                  : "bg-muted-foreground/30"
                              )}
                              title={`Paragraph ${i + 1}${details?.submissions?.[i] ? ' (submitted)' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentParagraphIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentParagraphIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentParagraphIndex(prev => Math.min((totalParagraphs || 1) - 1, prev + 1))}
                          disabled={currentParagraphIndex === (totalParagraphs || 1) - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <TabsContent value="paragraph" className="flex-1 min-h-0 mt-4">
                    {moduleContent && (
                      <Card className="shadow-md overflow-hidden h-full flex flex-col">
                       <CardHeader className="flex-shrink-0 pb-3 border-b">
                         <div className="flex items-center justify-between">
                           <CardTitle className="flex items-center gap-2 text-lg">
                             <div className="p-2 bg-primary/10 rounded-lg">
                               <BookOpen className="h-4 w-4 text-primary" />
                             </div>
                             Paragraph {currentParagraphIndex + 1}
                           </CardTitle>
                         </div>
                       </CardHeader>
                         <CardContent className="flex-1 min-h-0 pb-4">
                           <Textarea
                             value={moduleContent.structuredContent[currentParagraphIndex]?.text || ''}
                             className="h-full resize-none"
                             readOnly
                           />
                        </CardContent>
                     </Card>
                   )}
                  </TabsContent>
                  
                  <TabsContent value="submission" className="flex-1 min-h-0 mt-4">
                    <Card className="shadow-md overflow-hidden h-full flex flex-col">
                      <CardHeader className="flex-shrink-0 pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          Student Submission
                          {details?.submissions?.[currentParagraphIndex] && (
                            <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Submitted
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 pb-4">
                        <div className="h-full overflow-auto">
                          {details?.submissions?.[currentParagraphIndex] ? (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Paragraph Summary:</h4>
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <Textarea
                                    value={details?.submissions?.[currentParagraphIndex]?.paragraphSummary || ''}
                                    className="min-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                    readOnly
                                  />
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Cumulative Summary:</h4>
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <Textarea
                                    value={details?.submissions?.[currentParagraphIndex]?.cumulativeSummary || 'No cumulative summary provided.'}
                                    className="min-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                    readOnly
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <p className="text-sm italic">No submission for this paragraph yet.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

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
                        <FormLabel>Score (0-100)</FormLabel>
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
                            className="min-h-[100px] resize-none"
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
    </TooltipProvider>
  );
}
