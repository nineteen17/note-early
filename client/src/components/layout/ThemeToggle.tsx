'use client'

import * as React from "react"
import { Sun, Moon, Laptop, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Toggle theme" className="bg-primary text-primary-foreground">
          {/* Animated icon swap on open */}
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          className="flex items-center justify-between gap-2 "
          onClick={() => setTheme("light")}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {resolvedTheme === "light" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center justify-between gap-2"
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {resolvedTheme === "dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center justify-between gap-2"
          onClick={() => setTheme("system")}
        >
          <Laptop className="h-4 w-4" />
          <span>System</span>
          {resolvedTheme === "system" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}