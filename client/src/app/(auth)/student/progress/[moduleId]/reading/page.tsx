'use client';

import { use } from 'react';
import { ReadingProgressFeature } from '@/features/student/progress/reading';

interface ModuleDetailsPageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default function ModuleDetailsPage({ params }: ModuleDetailsPageProps) {
  const { moduleId } = use(params);

  return <ReadingProgressFeature moduleId={moduleId} />;
} 