'use client';

import React, { useEffect, useState } from 'react';
import { useModuleQuery } from '@/hooks/api/modules';
import { useStudentModuleProgressQuery } from '@/hooks/api/progress';
import { useSubmitSummaryMutation } from '@/hooks/api/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ReadingModule, StudentProgressDetailsDTO, Paragraph } from '@/shared/types';

// --- Import Child Components ---
import { ParagraphDisplay } from './ParagraphDisplay';
import { SummaryInput } from './SummaryInput';
import { NavigationControls } from './NavigationControls';
import { VocabularyDisplay } from './VocabularyDisplay'; // <<< Import VocabularyDisplay
// -----------------------------

export function ModuleFeature() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(1);
  const [paragraphSummary, setParagraphSummary] = useState("");
  const [cumulativeSummary, setCumulativeSummary] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch module and progress data
  const { data: module, isLoading: isLoadingModule, error: moduleError } = useModuleQuery(moduleId);
  const { data: progress, isLoading: isLoadingProgress, error: progressError } = useStudentModuleProgressQuery(moduleId);
  const { mutate: submitSummary, isPending: isSubmitting } = useSubmitSummaryMutation();

  // Initialize current paragraph based on progress
  useEffect(() => {
    if (progress?.highestParagraphIndexReached && !isInitialized) {
      setCurrentParagraphIndex(progress.highestParagraphIndexReached);
      setIsInitialized(true);
    } else if (!isInitialized) {
      // If no progress or no highest paragraph index, start from the beginning
      setCurrentParagraphIndex(1);
      setIsInitialized(true);
    }
  }, [progress, isInitialized]);

  // Handle loading states
  if (isLoadingModule || isLoadingProgress) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Handle error states
  if (moduleError || progressError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {moduleError?.message || progressError?.message || "Failed to load module"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!module) {
    return (
      <Alert>
        <AlertDescription>Module not found</AlertDescription>
      </Alert>
    );
  }

  const currentParagraph = module.structuredContent.find((p: Paragraph) => p.index === currentParagraphIndex);
  const isLastParagraph = currentParagraphIndex === module.paragraphCount;
  const hasSubmittedCurrentParagraph = progress?.submissions?.some(
    (s) => s.paragraphIndex === currentParagraphIndex
  );

  const handleSubmit = () => {
    if (!currentParagraph) return;

    submitSummary({
      moduleId,
      paragraphIndex: currentParagraphIndex,
      paragraphSummary,
      cumulativeSummary
    }, {
      onSuccess: () => {
        setParagraphSummary("");
        if (!isLastParagraph) {
          setCurrentParagraphIndex(prev => prev + 1);
        }
      }
    });
  };

  const handleNext = () => {
    if (!isLastParagraph) {
      setCurrentParagraphIndex(prev => prev + 1);
      setParagraphSummary("");
    }
  };

  const handlePrevious = () => {
    if (currentParagraphIndex > 1) {
      setCurrentParagraphIndex(prev => prev - 1);
      setParagraphSummary("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{module.title}</h1>
        <div className="text-sm text-muted-foreground">
          Paragraph {currentParagraphIndex} of {module.paragraphCount}
        </div>
      </div>

      <Card className="p-6">
        <div className="prose max-w-none">
          {currentParagraph?.text}
        </div>
      </Card>

      <div className="space-y-4">
        <Textarea
          placeholder="Write your summary of this paragraph..."
          value={paragraphSummary}
          onChange={(e) => setParagraphSummary(e.target.value)}
          disabled={hasSubmittedCurrentParagraph || isSubmitting}
          className="min-h-[100px]"
        />

        <Textarea
          placeholder="Write your cumulative summary so far..."
          value={cumulativeSummary}
          onChange={(e) => setCumulativeSummary(e.target.value)}
          disabled={hasSubmittedCurrentParagraph || isSubmitting}
          className="min-h-[100px]"
        />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentParagraphIndex === 1 || isSubmitting}
          >
            Previous
          </Button>

          {hasSubmittedCurrentParagraph ? (
            <Button
              onClick={handleNext}
              disabled={isLastParagraph || isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!paragraphSummary || !cumulativeSummary || isSubmitting}
            >
              Submit Summary
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModuleFeature;