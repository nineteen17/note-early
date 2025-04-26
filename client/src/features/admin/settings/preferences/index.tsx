'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// TODO: Import useTheme hook from next-themes if using it for theme switching

export function PreferencesSettingsTab() {
  // TODO: Get current theme and implement theme setting logic
  // const { theme, setTheme } = useTheme(); // Example if using next-themes
  const currentTheme = 'system'; // Placeholder

  const handleThemeChange = (value: string) => {
    console.log("Theme changed to:", value);
    // setTheme(value); // Example
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Customize the appearance and behavior of the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="grid gap-2">
          <Label>Theme</Label>
          <RadioGroup 
            defaultValue={currentTheme}
            onValueChange={handleThemeChange}
            className="grid grid-cols-3 gap-4 pt-2"
          >
            <div>
              <RadioGroupItem value="light" id="light" className="peer sr-only" />
              <Label
                htmlFor="light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                 {/* Optional: Add Light theme icon */}
                Light
              </Label>
            </div>
            <div>
              <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
              <Label
                htmlFor="dark"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                 {/* Optional: Add Dark theme icon */}
                Dark
              </Label>
            </div>
            <div>
              <RadioGroupItem value="system" id="system" className="peer sr-only" />
              <Label
                htmlFor="system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                 {/* Optional: Add System theme icon */}
                System
              </Label>
            </div>
          </RadioGroup>
        </div>
        
         {/* TODO: Add other preferences like Language, Notifications, etc. */}

      </CardContent>
    </Card>
  );
} 