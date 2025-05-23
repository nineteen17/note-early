'use client';

import React from 'react';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion"; // Use Accordion for display
interface VocabularyDisplayProps {
  moduleId: string;
  paragraphIndex: number; // 1-based index
}

export function VocabularyDisplay({ moduleId, paragraphIndex }: VocabularyDisplayProps) {
  const {
    data: vocabularyEntries,
    isLoading,
    isError,
    error,
  } = useParagraphVocabularyQuery(moduleId, paragraphIndex);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (isError) {
    console.error("VocabularyDisplay: Error fetching vocabulary", error);
    return <p className="text-xs text-destructive italic">[Error loading vocabulary]</p>;
  }

  if (!vocabularyEntries || vocabularyEntries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No vocabulary defined for this paragraph.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {vocabularyEntries.map((entry) => (
        <AccordionItem value={entry.id} key={entry.id}>
          <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
            {entry.word}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground pl-4 pb-2">
            {entry.description}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
} 