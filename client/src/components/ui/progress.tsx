"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'in-progress' | 'completed'
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = 'default', ...props }, ref) => {
  const getIndicatorColor = () => {
    switch (variant) {
      case 'in-progress':
        return 'bg-secondary' // Purple
      case 'completed':
        return 'bg-[#4BAE4F]' // Green (success color)
      default:
        return 'bg-accent' // Orange (default)
    }
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-border/30",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-in-out rounded-full",
          getIndicatorColor()
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          opacity: (value || 0) > 0 ? 1 : 0
        }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress } 