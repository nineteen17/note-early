'use client';

import { useRouter } from 'next/navigation';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useParagraphQuery } from '@/hooks/api/readingModules/useParagraphQuery';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useSubmitSummaryMutation } from '@/hooks/api/student/progress/useSubmitSummaryMutation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  BookOpen, 
  Edit, 
  Eye,
  CheckCircle,
  Clock,
  User,
  Lock,
  HelpCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { VocabularyEntryDTO } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpTooltip, HelpIcon } from '@/components/ui/help-tooltip';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReadTextArea } from "@/components/ui/read-text-area";

interface ReadingProgressFeatureProps {
  moduleId: string;
}

export function ReadingProgressFeature({ moduleId }: ReadingProgressFeatureProps) {
  const router = useRouter();
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(1);
  const [paragraphSummary, setParagraphSummary] = useState('');
  const [cumulativeSummary, setCumulativeSummary] = useState('');
  const [mobileTab, setMobileTab] = useState<'paragraph' | 'submission'>('paragraph');
  
  const { data: module, isLoading: isModuleLoading, error: moduleError } = useModuleQuery(moduleId);
  const { data: paragraph, isLoading: isParagraphLoading, error: paragraphError, refetch: refetchParagraph } = useParagraphQuery(moduleId, currentParagraphIndex);
  const { data: vocabulary } = useParagraphVocabularyQuery(moduleId, currentParagraphIndex);
  const { data: progressDetails, isLoading: isProgressLoading } = useStudentProgressDetailsQuery(moduleId);
  const submitSummaryMutation = useSubmitSummaryMutation();

  // Separate initial loading from content loading
  const isInitialLoading = (isModuleLoading && !module) || (isProgressLoading && !progressDetails);
  const isParagraphContentLoading = isParagraphLoading;
  
  // Only show critical errors that prevent the entire component from working
  const hasCriticalError = (moduleError && !module) || (isProgressLoading === false && !progressDetails);

  // Reset summaries when changing paragraphs
  useEffect(() => {
    setParagraphSummary('');
    setCumulativeSummary('');
  }, [currentParagraphIndex]);

  // Show skeleton only on initial load
  if (isInitialLoading) {
    return <StudentSkeleton />;
  }

  // Show error only for critical failures that prevent the component from functioning
  if (hasCriticalError || !module) {
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

  const handlePrevious = () => {
    if (currentParagraphIndex > 1) {
      setCurrentParagraphIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    // Only allow navigation to next paragraph if current paragraph is submitted (unless module is completed)
    const currentSubmission = progressDetails?.submissions?.find(
      sub => sub.paragraphIndex === currentParagraphIndex
    );
    
    if (currentParagraphIndex < module.paragraphCount && (currentSubmission || isCompleted)) {
      setCurrentParagraphIndex(prev => prev + 1);
    }
  };

  const handleSubmitSummary = async () => {
    if (!paragraphSummary) {
      return;
    }

    try {
      // For the first paragraph, use the paragraph summary as the cumulative summary
      const finalCumulativeSummary = currentParagraphIndex === 1 
        ? paragraphSummary 
        : cumulativeSummary;

      await submitSummaryMutation.mutateAsync({
        moduleId,
        paragraphIndex: currentParagraphIndex,
        paragraphSummary,
        cumulativeSummary: finalCumulativeSummary
      });

      // If this was the last paragraph, redirect to the report page
      if (currentParagraphIndex === module.paragraphCount) {
        router.push(`/student/progress/${moduleId}/report`);
      } else {
        // Otherwise move to next paragraph
        handleNext();
      }
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to submit summary:', error);
    }
  };

  // Check if this paragraph has already been submitted
  const currentSubmission = progressDetails?.submissions?.find(
    sub => sub.paragraphIndex === currentParagraphIndex
  );

  // Check if module is completed
  const isCompleted = progressDetails?.progress?.completed;

  return (
    <TooltipProvider>
      <PageContainer>
        <div className="space-y-6">
          <Breadcrumb 
            items={[
              { label: 'Progress', href: '/student/progress' },
              isCompleted ? { label: 'Completed', href: '/student/progress/completed' } : { label: 'In Progress', href: '/student/progress' },
              { label: module.title, href: isCompleted ? `/student/progress/${moduleId}/report` : `/student/progress/${moduleId}/reading` },
              { label: `Paragraph ${currentParagraphIndex}` }
            ]} 
          />

          {/* Enhanced Header Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-grow">
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-pointer">
                          <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight truncate max-w-[300px] sm:max-w-[500px] md:max-w-[600px]">
                            {module.title}
                          </CardTitle>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{module.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription className="text-sm">
                    Reading Progress • Paragraph {currentParagraphIndex} of {module.paragraphCount}
                  </CardDescription>
                </div>
                
                {/* Compact Meta Information */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{progressDetails?.submissions?.length || 0}/{module.paragraphCount}</span>
                  </div>
                  
                  <Badge 
                    variant={isCompleted ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      isCompleted 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    )}
                  >
                    {isCompleted ? "Complete" : `${Math.round(((progressDetails?.submissions?.length || 0) / module.paragraphCount) * 100)}%`}
                  </Badge>
                  
                  {isCompleted && (
                    <Button size="sm" onClick={() => router.push(`/student/progress/${moduleId}/report`)} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Report
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="flex flex-col h-[calc(100vh-280px)]">
            {/* Desktop View - Side by Side Cards */}
            <div className="hidden lg:block flex-1 min-h-0">
              <div className="grid gap-6 lg:grid-cols-2 h-full">
                {/* Original Paragraph Content */}
                <Card className="shadow-md overflow-hidden flex flex-col h-full">
                 <CardHeader className="flex-shrink-0 pb-3 border-b">
                   <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2 text-lg">
                       <div className="p-2 bg-primary/10 rounded-lg">
                         <BookOpen className="h-4 w-4 text-primary" />
                       </div>
                       Paragraph {currentParagraphIndex}
                     </CardTitle>
                     
                     {/* Navigation Controls */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <span className="text-sm font-medium">
                           {currentParagraphIndex} of {module.paragraphCount}
                         </span>
                         <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1" title="Green dots show completed paragraphs. Current paragraph is highlighted. Complete each paragraph in order to unlock the next.">
                             {Array.from({ length: module.paragraphCount || 0 }, (_, i) => {
                               const paragraphSubmission = progressDetails?.submissions?.find(s => s.paragraphIndex === i + 1);
                               const canNavigate = i + 1 <= currentParagraphIndex || paragraphSubmission || isCompleted;
                               
                               return (
                                 <button
                                   key={i}
                                   onClick={() => canNavigate && setCurrentParagraphIndex(i + 1)}
                                   disabled={!canNavigate}
                                   className={cn(
                                     "w-2.5 h-2.5 rounded-full transition-colors",
                                     !canNavigate && "cursor-not-allowed opacity-50",
                                     i + 1 === currentParagraphIndex 
                                       ? "bg-accent" 
                                       : paragraphSubmission
                                       ? "bg-green-500"
                                       : "bg-muted-foreground/30"
                                   )}
                                   title={`Paragraph ${i + 1}${paragraphSubmission ? ' (submitted)' : canNavigate ? '' : ' (locked - complete previous paragraphs first)'}`}
                                 />
                               );
                             })}
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-1 pl-4">
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={handlePrevious}
                               disabled={currentParagraphIndex === 1}
                             >
                               <ChevronLeft className="h-4 w-4" />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             {currentParagraphIndex === 1 ? "Already at first paragraph" : "Previous paragraph"}
                           </TooltipContent>
                         </Tooltip>
                         
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={handleNext}
                               disabled={
                                 currentParagraphIndex === module.paragraphCount || 
                                 (!currentSubmission && !isCompleted)
                               }
                               className={cn(
                                 (currentParagraphIndex === module.paragraphCount || (!currentSubmission && !isCompleted))
                                   ? "cursor-not-allowed"
                                   : ""
                               )}
                             >
                               <ChevronRight className="h-4 w-4" />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             {currentParagraphIndex === module.paragraphCount 
                               ? "Already at last paragraph" 
                               : (!currentSubmission && !isCompleted)
                               ? "Complete current paragraph to continue"
                               : "Next paragraph"
                             }
                           </TooltipContent>
                         </Tooltip>
                       </div>
                     </div>
                   </div>
                 </CardHeader>
                   <CardContent className="flex-1 min-h-0 pb-4">
                     {isParagraphContentLoading || !paragraph ? (
                       <div className="space-y-4 p-4">
                         <Skeleton className="h-4 w-3/4" />
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-5/6" />
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-2/3" />
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-4/5" />
                       </div>
                                              ) : paragraphError ? (
                           <div className="h-full flex items-center justify-center">
                             <div className="text-center text-muted-foreground py-8">
                               <p className="text-sm mb-2">⚠️ Failed to load paragraph content</p>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 onClick={() => refetchParagraph()}
                               >
                                 Retry
                               </Button>
                             </div>
                           </div>
                     ) : (!currentSubmission || isCompleted) ? (
                       <div className="h-full">
                         {isCompleted && currentSubmission && (
                           <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                             <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                               📚 Review Mode - Original content now visible for review
                             </p>
                           </div>
                         )}
                         <ReadTextArea text={paragraph.text || ''} vocabulary={vocabulary || []} />
                       </div>
                     ) : (
                       <div className="h-full flex items-center justify-center">
                         <div className="text-center text-muted-foreground py-8">
                           <div className="space-y-2">
                             <p className="text-sm">
                               🔒 Original paragraph hidden until module completion. Complete all paragraphs to unlock review mode.
                             </p>
                             <HelpIcon content="Reading passages are hidden to help you focus on summarizing from memory. You'll see the original text when you complete all paragraphs." />
                           </div>
                         </div>
                       </div>
                     )}
                   </CardContent>
               </Card>

               {/* Student Work Section */}
               <Card className="shadow-md overflow-hidden flex flex-col h-full">
                 <CardHeader className="flex-shrink-0 pb-3 border-b">
                   <CardTitle className="flex items-center gap-2 text-lg">
                     <div className="p-2 bg-blue-500/10 rounded-lg">
                       {currentSubmission ? <Eye className="h-4 w-4 text-blue-600" /> : <Edit className="h-4 w-4 text-blue-600" />}
                     </div>
                     {currentSubmission ? "Your Summary" : "Write Summary"}
                     {currentSubmission && (
                       <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                         Submitted
                       </Badge>
                     )}
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="flex-1 min-h-0 pb-4">
                   <div className="h-full overflow-auto">
                     {currentSubmission ? (
                       <div className="space-y-4">
                         <div>
                           <h4 className="font-medium text-sm mb-2">Paragraph Summary:</h4>
                           <div className="bg-muted/30 rounded-lg p-3">
                             <Textarea
                               value={currentSubmission.paragraphSummary || ''}
                               className="min-h-[150px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                               readOnly
                             />
                           </div>
                         </div>
                         {currentParagraphIndex > 1 && (
                           <div>
                             <h4 className="font-medium text-sm mb-2">Cumulative Summary:</h4>
                             <div className="bg-muted/30 rounded-lg p-3">
                               <Textarea
                                 value={currentSubmission.cumulativeSummary || 'No cumulative summary provided.'}
                                 className="min-h-[150px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                 readOnly
                               />
                             </div>
                           </div>
                         )}
                         <div className="text-xs text-muted-foreground">
                           Submitted on {new Date(currentSubmission.submittedAt).toLocaleDateString()}
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-4 h-full">
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <Label htmlFor="paragraphSummary">Paragraph Summary</Label>
                             <HelpIcon content="Write 2-3 sentences summarizing the main points of this paragraph. Focus on key events, characters, or ideas." />
                           </div>
                           <Textarea
                             id="paragraphSummary"
                             placeholder="Summarize this paragraph..."
                             value={paragraphSummary}
                             onChange={(e) => setParagraphSummary(e.target.value)}
                             className="min-h-[150px]"
                             autoFocus={false}
                           />
                         </div>
                         {currentParagraphIndex > 1 && (
                           <div className="space-y-2">
                             <div className="flex items-center gap-2">
                               <Label htmlFor="cumulativeSummary">Cumulative Summary</Label>
                               <HelpTooltip content={
                                 <div className="max-w-xs space-y-2">
                                   <p className="font-medium">What is a Cumulative Summary?</p>
                                   <p className="text-sm">
                                     A cumulative summary combines your understanding of all paragraphs read so far.
                                     It helps you track the overall story and how each new paragraph connects to what you&apos;ve already read.
                                   </p>
                                   <p className="text-sm">
                                     For example, if you&apos;re reading a story about a journey, your cumulative summary would include:
                                   </p>
                                   <ul className="text-sm list-disc pl-4">
                                     <li>Key events from previous paragraphs</li>
                                     <li>How new information connects to earlier parts</li>
                                     <li>The overall story progression</li>
                                   </ul>
                                 </div>
                               } />
                             </div>
                             <Textarea
                               id="cumulativeSummary"
                               placeholder="Summarize the story so far..."
                               value={cumulativeSummary}
                               onChange={(e) => setCumulativeSummary(e.target.value)}
                               className="min-h-[150px]"
                               autoFocus={false}
                             />
                           </div>
                         )}
                         <div className="flex justify-end pt-4">
                           <HelpTooltip content={
                             currentParagraphIndex === module.paragraphCount 
                               ? "This will complete the module and show your final report"
                               : "Submit your summary to unlock the next paragraph"
                           }>
                             <Button
                               onClick={handleSubmitSummary}
                               disabled={!paragraphSummary || (currentParagraphIndex > 1 && !cumulativeSummary) || submitSummaryMutation.isPending}
                             >
                               {submitSummaryMutation.isPending ? 'Submitting...' : 
                                 currentParagraphIndex === module.paragraphCount ? 'Complete Module' : 'Submit Summary'}
                             </Button>
                           </HelpTooltip>
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
                    <TabsTrigger value="paragraph">Reading</TabsTrigger>
                    <TabsTrigger value="submission">{currentSubmission ? "Your Work" : "Write Summary"}</TabsTrigger>
                  </TabsList>
                  
                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {currentParagraphIndex} of {module.paragraphCount}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: module.paragraphCount || 0 }, (_, i) => {
                          const paragraphSubmission = progressDetails?.submissions?.find(s => s.paragraphIndex === i + 1);
                          const canNavigate = i + 1 <= currentParagraphIndex || paragraphSubmission || isCompleted;
                          
                          return (
                            <button
                              key={i}
                              onClick={() => canNavigate && setCurrentParagraphIndex(i + 1)}
                              disabled={!canNavigate}
                              className={cn(
                                "w-2.5 h-2.5 rounded-full transition-colors",
                                !canNavigate && "cursor-not-allowed opacity-50",
                                i + 1 === currentParagraphIndex 
                                  ? "bg-accent" 
                                  : paragraphSubmission
                                  ? "bg-green-500"
                                  : "bg-muted-foreground/30"
                              )}
                              title={`Paragraph ${i + 1}${paragraphSubmission ? ' (submitted)' : canNavigate ? '' : ' (locked - complete previous paragraphs first)'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentParagraphIndex === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {currentParagraphIndex === 1 ? "Already at first paragraph" : "Previous paragraph"}
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleNext}
                            disabled={
                              currentParagraphIndex === module.paragraphCount || 
                              (!currentSubmission && !isCompleted)
                            }
                            className={cn(
                              (currentParagraphIndex === module.paragraphCount || (!currentSubmission && !isCompleted))
                                ? "cursor-not-allowed"
                                : ""
                            )}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {currentParagraphIndex === module.paragraphCount 
                            ? "Already at last paragraph" 
                            : (!currentSubmission && !isCompleted)
                            ? "Complete current paragraph to continue"
                            : "Next paragraph"
                          }
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                
                <TabsContent value="paragraph" className="flex-1 min-h-0 mt-4">
                  <Card className="shadow-md overflow-hidden h-full flex flex-col">
                   <CardHeader className="flex-shrink-0 pb-3 border-b">
                     <div className="flex items-center justify-between">
                       <CardTitle className="flex items-center gap-2 text-lg">
                         <div className="p-2 bg-primary/10 rounded-lg">
                           <BookOpen className="h-4 w-4 text-primary" />
                         </div>
                         Paragraph {currentParagraphIndex}
                       </CardTitle>
                     </div>
                   </CardHeader>
                     <CardContent className="flex-1 min-h-0 pb-4">
                       {isParagraphContentLoading || !paragraph ? (
                         <div className="space-y-4 p-4">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-5/6" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-2/3" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-4/5" />
                         </div>
                       ) : paragraphError ? (
                         <div className="h-full flex items-center justify-center">
                           <div className="text-center text-muted-foreground py-8">
                             <p className="text-sm mb-2">⚠️ Failed to load paragraph content</p>
                             <Button 
                               size="sm" 
                               variant="outline" 
                               onClick={() => refetchParagraph()}
                             >
                               Retry
                             </Button>
                           </div>
                         </div>
                       ) : (!currentSubmission || isCompleted) ? (
                         <div className="h-full">
                           {isCompleted && currentSubmission && (
                             <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                               <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                 📚 Review Mode - Original content now visible for review
                               </p>
                             </div>
                           )}
                           <ReadTextArea text={paragraph.text || ''} vocabulary={vocabulary || []} />
                         </div>
                       ) : (
                         <div className="h-full flex items-center justify-center">
                           <div className="text-center text-muted-foreground py-8">
                             <p className="text-sm">
                               🔒 Original paragraph hidden until module completion. Complete all paragraphs to unlock review mode.
                             </p>
                           </div>
                         </div>
                       )}
                     </CardContent>
                 </Card>
                </TabsContent>
                
                <TabsContent value="submission" className="flex-1 min-h-0 mt-4">
                  <Card className="shadow-md overflow-hidden h-full flex flex-col">
                    <CardHeader className="flex-shrink-0 pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          {currentSubmission ? <Eye className="h-4 w-4 text-blue-600" /> : <Edit className="h-4 w-4 text-blue-600" />}
                        </div>
                        {currentSubmission ? "Your Summary" : "Write Summary"}
                        {currentSubmission && (
                          <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Submitted
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pb-4">
                      <div className="h-full overflow-auto">
                        {currentSubmission ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2">Paragraph Summary:</h4>
                              <div className="bg-muted/30 rounded-lg p-3">
                                <Textarea
                                  value={currentSubmission.paragraphSummary || ''}
                                  className="min-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                  readOnly
                                />
                              </div>
                            </div>
                            {currentParagraphIndex > 1 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Cumulative Summary:</h4>
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <Textarea
                                    value={currentSubmission.cumulativeSummary || 'No cumulative summary provided.'}
                                    className="min-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                                    readOnly
                                  />
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Submitted on {new Date(currentSubmission.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 h-full">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor="paragraphSummary">Paragraph Summary</Label>
                                <HelpIcon content="Write 2-3 sentences summarizing the main points of this paragraph. Focus on key events, characters, or ideas." />
                              </div>
                              <Textarea
                                id="paragraphSummary"
                                placeholder="Summarize this paragraph..."
                                value={paragraphSummary}
                                onChange={(e) => setParagraphSummary(e.target.value)}
                                className="min-h-[120px]"
                                autoFocus={false}
                              />
                            </div>
                            {currentParagraphIndex > 1 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="cumulativeSummary">Cumulative Summary</Label>
                                  <HelpTooltip content={
                                    <div className="max-w-xs space-y-2">
                                      <p className="font-medium">What is a Cumulative Summary?</p>
                                      <p className="text-sm">
                                        A cumulative summary combines your understanding of all paragraphs read so far.
                                        It helps you track the overall story and how each new paragraph connects to what you&apos;ve already read.
                                      </p>
                                      <p className="text-sm">
                                        For example, if you&apos;re reading a story about a journey, your cumulative summary would include:
                                      </p>
                                      <ul className="text-sm list-disc pl-4">
                                        <li>Key events from previous paragraphs</li>
                                        <li>How new information connects to earlier parts</li>
                                        <li>The overall story progression</li>
                                      </ul>
                                    </div>
                                  } />
                                </div>
                                <Textarea
                                  id="cumulativeSummary"
                                  placeholder="Summarize the story so far..."
                                  value={cumulativeSummary}
                                  onChange={(e) => setCumulativeSummary(e.target.value)}
                                  className="min-h-[120px]"
                                  autoFocus={false}
                                />
                              </div>
                            )}
                            <div className="flex justify-end pt-4">
                              <HelpTooltip content={
                                currentParagraphIndex === module.paragraphCount 
                                  ? "This will complete the module and show your final report"
                                  : "Submit your summary to unlock the next paragraph"
                              }>
                                <Button
                                  onClick={handleSubmitSummary}
                                  disabled={!paragraphSummary || (currentParagraphIndex > 1 && !cumulativeSummary) || submitSummaryMutation.isPending}
                                >
                                  {submitSummaryMutation.isPending ? 'Submitting...' : 
                                    currentParagraphIndex === module.paragraphCount ? 'Complete Module' : 'Submit Summary'}
                                </Button>
                              </HelpTooltip>
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
        </div>
      </PageContainer>
    </TooltipProvider>
  );
}