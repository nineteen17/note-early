import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useHelpStore } from '@/store/helpStore';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

export function HelpTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  className,
  iconClassName,
  showIcon = true
}: HelpTooltipProps) {
  const isHelpEnabled = useHelpStore((state) => state.isHelpEnabled);
  const [isOpen, setIsOpen] = useState(false);

  // If help is disabled, don't show the tooltip
  if (!isHelpEnabled) {
    return <>{children}</>;
  }

  const trigger = children || (
    showIcon && (
      <HelpCircle 
        className={cn(
          "h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors",
          iconClassName
        )} 
      />
    )
  );

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <span 
            className={cn("inline-flex items-center cursor-pointer", className)}
            onClick={() => setIsOpen(!isOpen)}
          >
            {trigger}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Wrapper component for inline help icons
export function HelpIcon({
  content,
  className,
  ...props
}: Omit<HelpTooltipProps, 'children' | 'showIcon'>) {
  return (
    <HelpTooltip
      content={content}
      showIcon={true}
      className={cn("ml-1", className)}
      {...props}
    />
  );
} 