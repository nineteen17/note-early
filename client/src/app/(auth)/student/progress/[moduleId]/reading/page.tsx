'use client';

import { useRouter } from 'next/navigation';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useParagraphQuery } from '@/hooks/api/readingModules/useParagraphQuery';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useSubmitSummaryMutation } from '@/hooks/api/student/progress/useSubmitSummaryMutation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { use } from 'react';
import type { VocabularyEntryDTO } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Progress } from '@/components/ui/progress';

interface ModuleDetailsPageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default function ModuleDetailsPage({ params }: ModuleDetailsPageProps) {
  const { moduleId } = use(params);
  const router = useRouter();
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(1);
  const [paragraphSummary, setParagraphSummary] = useState('');
  const [cumulativeSummary, setCumulativeSummary] = useState('');
  
  const { data: module, isLoading: isModuleLoading, error: moduleError } = useModuleQuery(moduleId);
  const { data: paragraph, isLoading: isParagraphLoading, error: paragraphError } = useParagraphQuery(moduleId, currentParagraphIndex);
  const { data: vocabulary } = useParagraphVocabularyQuery(moduleId, currentParagraphIndex);
  const { data: progressDetails, isLoading: isProgressLoading } = useStudentProgressDetailsQuery(moduleId);
  const submitSummaryMutation = useSubmitSummaryMutation();

  const isLoading = isModuleLoading || isParagraphLoading || isProgressLoading;
  const error = moduleError || paragraphError;

  // Reset summaries when changing paragraphs
  useEffect(() => {
    setParagraphSummary('');
    setCumulativeSummary('');
  }, [currentParagraphIndex]);

  if (isLoading) {
    return <StudentSkeleton />;
  }

  if (error || !module || !paragraph) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || 'Failed to load module details. Please try again later.'}
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
    if (currentParagraphIndex < module.paragraphCount) {
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
    <PageContainer>
      <div className="space-y-4">
        <Breadcrumb 
          items={[
            { label: 'Progress', href: '/student/progress' },
            isCompleted ? { label: 'Completed', href: '/student/progress/completed' } : { label: 'In Progress', href: '/student/progress' },
            { label: module.title, href: isCompleted ? `/student/progress/${moduleId}/report` : `/student/progress/${moduleId}/reading` },
            { label: `Paragraph ${currentParagraphIndex}` }
          ]} 
        />
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl font-bold break-words">{module.title}</CardTitle>
                
                {/* Optimized Progress Information */}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                      <span>Paragraph {currentParagraphIndex} of {module.paragraphCount}</span>
                      <span className="hidden sm:inline text-xs">•</span>
                      <span>{progressDetails?.submissions?.length || 0} submitted</span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {isCompleted && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                          ✓ Complete
                        </span>
                      )}
                      <span className={`text-sm font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        {Math.round(((progressDetails?.submissions?.length || 0) / module.paragraphCount) * 100)}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={((progressDetails?.submissions?.length || 0) / module.paragraphCount) * 100} 
                    className={`h-2 transition-colors ${
                      isCompleted 
                        ? 'bg-green-100 dark:bg-green-950/20' 
                        : 'bg-purple-100 dark:bg-purple-950/20'
                    }`}
                    style={{
                      '--progress-foreground': isCompleted 
                        ? 'hsl(142, 76%, 36%)' 
                        : 'hsl(262, 83%, 58%)'
                    } as React.CSSProperties}
                  />
                </div>
              </div>
              {isCompleted && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/student/progress/${moduleId}/report`)}
                  className="gap-2 shrink-0 w-full sm:w-auto hover:text-foreground/80"
                >
                  <FileText className="h-4 w-4" />
                  View Report
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Show paragraph text if: 1) Not yet submitted OR 2) Module is completed */}
              {(!currentSubmission || isCompleted) && (
                <div className="prose dark:prose-invert max-w-none">
                  {isCompleted && currentSubmission && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        📚 Review Mode - Original content now visible for review
                      </p>
                    </div>
                  )}
                  <p className="text-lg leading-relaxed">{paragraph.text}</p>
                </div>
              )}
              
              {/* Show placeholder when paragraph is hidden (submitted but module not complete) */}
              {currentSubmission && !isCompleted && (
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/20">
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">
                      🔒 Original paragraph hidden until module completion. Complete all paragraphs to unlock review mode.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Vocabulary section - only show if paragraph is visible OR if submission exists (vocabulary can still be helpful) */}
              {vocabulary && vocabulary.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Vocabulary</h3>
                  <div className="grid gap-4">
                    {vocabulary.map((entry: VocabularyEntryDTO) => (
                      <div key={entry.id} className="p-4 rounded-lg bg-muted">
                        <p className="font-medium">{entry.word}</p>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!currentSubmission && (
                <div className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="paragraphSummary">Paragraph Summary</Label>
                    <Textarea
                      id="paragraphSummary"
                      placeholder="Summarize this paragraph..."
                      value={paragraphSummary}
                      onChange={(e) => setParagraphSummary(e.target.value)}
                      className="min-h-[100px]"
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
                        className="min-h-[100px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {currentSubmission && (
                <div className="mt-8 space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <h3 className="text-lg font-semibold mb-2">Your Summary</h3>
                    <p className="text-sm text-muted-foreground mb-4">Submitted on {new Date(currentSubmission.submittedAt).toLocaleDateString()}</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-1">Paragraph Summary</h4>
                        <p className="text-sm">{currentSubmission.paragraphSummary}</p>
                      </div>
                      {currentParagraphIndex > 1 && (
                        <div>
                          <h4 className="font-medium mb-1">Cumulative Summary</h4>
                          <p className="text-sm">{currentSubmission.cumulativeSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {!currentSubmission ? (
              <Button
                onClick={handleSubmitSummary}
                disabled={!paragraphSummary || (currentParagraphIndex > 1 && !cumulativeSummary) || submitSummaryMutation.isPending}
              >
                {submitSummaryMutation.isPending ? 'Submitting...' : 
                  currentParagraphIndex === module.paragraphCount ? 'Complete Module' : 'Submit Summary'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentParagraphIndex === module.paragraphCount}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
} 