'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Lightbulb,
  Award,
  Zap,
  Bookmark,
  Timer,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useStudentActivityQuery } from '@/hooks/api/student/progress/useStudentActivityQuery';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReadingInsights from './ReadingInsights';
import ActivityCalendar from '@/features/student/analytics/ActivityCalender';
import { AnalyticsDashboard, useProgressMetrics } from './AnalyticsDashboard';
import GraphInsights from './GraphInsights';
interface Module {
  category: string;
  genre: string;
}

interface ProgressItem {
  moduleId: string;
  module?: Module;
  score?: number;
  completed?: boolean;
  timeSpentMinutes?: number;
}

const AnalyticsFeature: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { data: progress = [], isLoading: progressLoading } = useMyProgressQuery();
  const { data: activityData, isLoading: activityLoading } = useStudentActivityQuery();
  const progressMetrics = useProgressMetrics(progress, profile?.readingLevel);
  const isLoading = progressLoading || activityLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg"></CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-lg"></CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Analytics"
        description="Track your reading progress and module completion"
      />
    <div className="space-y-4 ">
      <AnalyticsDashboard metrics={progressMetrics} profile={profile} />
      <GraphInsights />

      {/* <ReadingInsights /> */}
      {/* <ActivityCalendar activityData={activityData} /> */}

    </div>
    </PageContainer>
  );
};

export default AnalyticsFeature; 