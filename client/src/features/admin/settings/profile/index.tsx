'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// TODO: Import useProfileQuery and necessary types later

export function ProfileSettingsTab() {
  // TODO: Fetch actual profile data using useProfileQuery
  const profile = {
    fullName: 'Sarah Johnson', // Placeholder
    email: 'sarah.johnson@example.com', // Placeholder
    role: 'Admin (Teacher)', // Placeholder
    avatarUrl: 'https://via.placeholder.com/150/771796', // Placeholder - use actual avatar URL
  };

  // TODO: Implement form handling for editable fields (e.g., name, avatar)
  // TODO: Implement avatar change logic

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        {/* Optional: Add a description if needed */}
        {/* <CardDescription>Manage your personal profile details.</CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
            <AvatarFallback>{profile.fullName?.charAt(0)?.toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
          {/* TODO: Make this button functional */}
          <Button variant="outline">Change Avatar</Button>
        </div>

        {/* Full Name Input */}
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full Name</Label>
          {/* TODO: Make input controlled if editable */}
          <Input id="fullName" defaultValue={profile.fullName} />
        </div>

        {/* Email Address Input (Likely read-only) */}
        <div className="grid gap-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" defaultValue={profile.email} readOnly disabled />
        </div>

        {/* Account Role Display */}
        <div className="grid gap-2">
          <Label htmlFor="role">Account Role</Label>
          <Input id="role" defaultValue={profile.role} readOnly disabled />
          <p className="text-sm text-muted-foreground">
            Admin role cannot be changed
          </p>
        </div>

      </CardContent>
      {/* Optional: Add CardFooter for actions if needed */}
    </Card>
  );
} 