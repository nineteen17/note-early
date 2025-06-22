import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:text-primary-foreground/80 hover:border-accent hover:bg-accent/10 hover:text-accent dark:bg-gradient-to-r dark:from-slate-50 dark:to-slate-100 dark:text-blue-800 dark:hover:from-slate-100 dark:hover:to-slate-200 dark:hover:text-blue-900",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg:primary-foreground dk:bg-background shadow-xs hover:bg-accent/10 hover:text-accent dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:hover:text-foreground dark:hover:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium",
        "primary-alt": "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90 hover:text-accent-foreground dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/90",
        scroll: "bg-primary/80 text-primary-foreground shadow-xs dark:bg-gradient-to-r dark:from-slate-50/80 dark:to-slate-100/80 dark:text-blue-800 dark:hover:from-slate-100/80 dark:hover:to-slate-200/80 dark:hover:text-blue-900",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
