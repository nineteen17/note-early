'use client';

import React from 'react';
import { useProfileQuery } from '@/hooks/api/profile/useProfileQuery';
import { Skeleton } from '@/components/ui/skeleton';

export function WelcomeHeader() {
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useProfileQuery();

  if (isProfileLoading) {
    return <Skeleton className="h-8 w-1/3" />;
  }

  if (profileError) {
    return <span className="text-xl font-semibold text-destructive">Error loading profile</span>;
  }

  return (
    <h1 className="text-2xl font-semibold">
      Welcome back, {profile?.fullName || 'Admin'}!
    </h1>
  );
} 