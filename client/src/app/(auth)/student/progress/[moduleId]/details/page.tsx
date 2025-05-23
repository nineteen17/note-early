'use client';

import { useRouter } from 'next/navigation';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useParagraphQuery } from '@/hooks/api/readingModules/useParagraphQuery';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useSubmitSummaryMutation } from '@/hooks/api/student/progress/useSubmitSummaryMutation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { use } from 'react';
import type { VocabularyEntryDTO } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpTooltip } from '@/components/ui/help-tooltip';

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
  const { data: vocabulary, isLoading: isVocabularyLoading } = useParagraphVocabularyQuery(moduleId, currentParagraphIndex);
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

      // Move to next paragraph after successful submission
      if (currentParagraphIndex < module.paragraphCount) {
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

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{module.title}</CardTitle>
          <CardDescription>
            Paragraph {currentParagraphIndex} of {module.paragraphCount}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed">{paragraph.text}</p>
            </div>
            
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
                            It helps you track the overall story and how each new paragraph connects to what you've already read.
                          </p>
                          <p className="text-sm">
                            For example, if you're reading a story about a journey, your cumulative summary would include:
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
              {submitSummaryMutation.isPending ? 'Submitting...' : 'Submit Summary'}
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
  );
} 