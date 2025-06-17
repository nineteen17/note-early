import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { VocabularyEntryDTO } from '@/types/api'

interface ReadTextAreaProps {
  text: string
  vocabulary?: VocabularyEntryDTO[]
  className?: string
}

// Compact inline vocabulary component
const ParagraphWithVocabulary = ({ text, vocabulary }: { text: string; vocabulary: VocabularyEntryDTO[] }) => {
  const [openTooltip, setOpenTooltip] = useState<number | null>(null);

  if (!vocabulary || vocabulary.length === 0) {
    return <p className="text-base leading-relaxed whitespace-pre-wrap">{text}</p>;
  }

  // Create a map of vocabulary words for quick lookup
  const vocabMap = new Map(vocabulary.map(item => [item.word.toLowerCase(), item.description]));
  
  // Split text into words while preserving punctuation and whitespace
  const words = text.split(/(\s+|[^\w\s]+)/);
  
  return (
    <div className="text-base leading-relaxed">
      {words.map((word, index) => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        const definition = vocabMap.get(cleanWord);
        
        if (definition && word.match(/\w/)) {
          return (
            <Tooltip key={index} open={openTooltip === index} onOpenChange={(open) => setOpenTooltip(open ? index : null)}>
              <TooltipTrigger asChild>
                <button 
                  type="button"
                  onClick={() => setOpenTooltip(openTooltip === index ? null : index)}
                  className="inline cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 active:text-blue-900 dark:active:text-blue-200 underline decoration-dotted underline-offset-2 transition-colors font-medium bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:bg-blue-200 dark:active:bg-blue-900/50 px-1 rounded touch-manipulation"
                  style={{ lineHeight: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}
                  aria-label={`Click to see definition of ${word}`}
                >
                  {word}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{vocabulary.find(v => v.word.toLowerCase() === cleanWord)?.word}</p>
                  <p className="text-sm text-muted-foreground">{definition}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }
        
        return <span key={index}>{word}</span>;
      })}
    </div>
  );
};

function ReadTextArea({ text, vocabulary = [], className, ...props }: ReadTextAreaProps) {
  return (
    <div
      className={cn(
        "h-full overflow-auto p-4 prose dark:prose-invert max-w-none bg-input dark:bg-input/30 rounded-lg",
        className
      )}
      {...props}
    >
      <ParagraphWithVocabulary text={text} vocabulary={vocabulary} />
    </div>
  )
}

export { ReadTextArea } 