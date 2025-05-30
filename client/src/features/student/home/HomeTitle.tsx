'use client';

import React from 'react';
import type { ProfileDTO } from '@/types/api';

interface HomeTitleProps {
  profile: ProfileDTO | null;
}

export function HomeTitle({ profile }: HomeTitleProps) {
  const studentName = profile?.fullName ?? 'Student';

  return (
    <div className="p-4 md:p-6 bg-card border shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {studentName}!
      </h1>
      <p className="text-muted-foreground mt-1">
        Ready to continue your reading journey?
      </p>
      {/* We can add more content here later, like stats or a quick start button */}
    </div>
  );
} 