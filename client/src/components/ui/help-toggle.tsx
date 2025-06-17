import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useHelpStore } from '@/store/helpStore';
import { cn } from '@/lib/utils';

interface HelpToggleProps {
  variant?: 'switch' | 'button';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function HelpToggle({ 
  variant = 'switch', 
  className,
  showLabel = true,
  size = 'default' 
}: HelpToggleProps) {
  const { isHelpEnabled, toggleHelp } = useHelpStore();

  if (variant === 'button') {
    return (
      <Button
        variant={isHelpEnabled ? 'secondary' : 'outline'}
        size={size}
        onClick={toggleHelp}
        className={cn("gap-2 ", className)}
      >
        <HelpCircle className="h-8 w-4" />
        {showLabel && (isHelpEnabled ? 'Hide Help' : 'Show Help')}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <label 
          htmlFor="help-toggle" 
          className="text-sm font-medium cursor-pointer"
        >
          Help Mode
        </label>
      )}
      <Switch
        id="help-toggle"
        checked={isHelpEnabled}
        onCheckedChange={toggleHelp}
      />
      <HelpCircle 
        className={cn(
          "h-4 w-4 transition-colors",
          isHelpEnabled ? "text-muted-foreground" : "text-muted-foreground/50"
        )} 
      />
    </div>
  );
}

// Quick access component for headers/toolbars
export function HelpToggleIcon({ className }: { className?: string }) {
  const { isHelpEnabled, toggleHelp } = useHelpStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleHelp}
      className={cn("h-8 w-8 p-0 hover:bg-primary-foreground/10", className)}
      title={isHelpEnabled ? 'Disable Help Mode' : 'Enable Help Mode'}
    >
      <HelpCircle 
        className={cn(
          "h-4 w-4 transition-colors",
          isHelpEnabled 
            ? "text-primary-foreground/90" 
            : "text-primary-foreground/50"
        )} 
      />
    </Button>
  );
} 