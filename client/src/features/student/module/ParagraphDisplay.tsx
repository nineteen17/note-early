'use client';

import React from 'react';

interface ParagraphDisplayProps {
  text: string | undefined | null;
}

export function ParagraphDisplay({ text }: ParagraphDisplayProps) {
  if (!text) {
    return <p className="text-muted-foreground italic">[Paragraph text not available]</p>;
  }

  // Using whitespace-pre-wrap to preserve formatting like line breaks
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
      {text}
    </div>
  );
} 