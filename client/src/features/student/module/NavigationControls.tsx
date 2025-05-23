'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationControlsProps {
  currentIndex: number;
  totalParagraphs: number;
  onNavigate: (newIndex: number) => void; // Callback to update index in parent
  // Add disabled state if needed during summary submission
  isDisabled?: boolean;
}

export function NavigationControls({
  currentIndex,
  totalParagraphs,
  onNavigate,
  isDisabled = false,
}: NavigationControlsProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalParagraphs - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(currentIndex + 1);
    }
    // Optional: Trigger summary submission validation/logic here if needed before navigating
  };

  return (
    <div className="flex justify-between items-center mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrev}
        disabled={!canGoPrev || isDisabled}
        aria-label="Previous Paragraph"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Paragraph {currentIndex + 1} of {totalParagraphs}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={!canGoNext || isDisabled}
        aria-label="Next Paragraph"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
} 