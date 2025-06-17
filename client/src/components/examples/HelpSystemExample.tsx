import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpTooltip, HelpIcon } from '@/components/ui/help-tooltip';
import { HelpToggle } from '@/components/ui/help-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function HelpSystemExample() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Help System Example</CardTitle>
          <CardDescription>
            This demonstrates how to use the global help toggle system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Help Toggle Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Help Toggle Controls</h3>
            <div className="flex gap-4 flex-wrap">
              <HelpToggle variant="switch" />
              <HelpToggle variant="button" size="sm" />
            </div>
          </div>

          {/* Form with Help Icons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form with Help Icons</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="email">Email</Label>
                <HelpIcon content="Enter your email address to receive notifications" />
              </div>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="password">Password</Label>
                <HelpIcon content="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers" />
              </div>
              <Input id="password" type="password" placeholder="Enter your password" />
            </div>
          </div>

          {/* Buttons with Help Tooltips */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Buttons with Help Tooltips</h3>
            <div className="flex gap-2">
              <HelpTooltip content="This will save your changes permanently">
                <Button>Save Changes</Button>
              </HelpTooltip>
              
              <HelpTooltip content="This will discard all unsaved changes">
                <Button variant="outline">Cancel</Button>
              </HelpTooltip>
            </div>
          </div>

          {/* Complex Help Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Complex Help Content</h3>
            <div className="flex items-center gap-2">
              <span>Advanced Settings</span>
              <HelpIcon 
                content={
                  <div className="space-y-2">
                    <p className="font-semibold">Advanced Settings Include:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>API Configuration</li>
                      <li>Database Settings</li>
                      <li>Security Options</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      Only modify these if you know what you're doing.
                    </p>
                  </div>
                }
                side="right"
              />
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How to Use</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>1. Toggle the help mode on/off using the controls above</p>
              <p>2. When help mode is ON, all help tooltips will be visible</p>
              <p>3. When help mode is OFF, help tooltips are hidden</p>
              <p>4. The help mode preference is saved to localStorage</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
} 