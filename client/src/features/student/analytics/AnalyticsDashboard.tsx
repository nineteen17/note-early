import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import type { StudentProgressSchema } from '@/types/api';

// Progress metrics hook
export const useProgressMetrics = (progress: StudentProgressSchema[], profileReadingLevel?: number | null) => {
  return React.useMemo(() => {
    const completedProgress = progress.filter(p => p.completed);
    // Count ALL non-completed modules as in progress (started modules)
    const inProgressCount = progress.filter(p => !p.completed).length;
    
    // Debug the recent activity calculation
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    console.log('Debug Analytics:', {
      totalProgress: progress.length,
      completed: completedProgress.length,
      inProgress: inProgressCount,
      weekAgo: weekAgo.toISOString(),
      progressWithDates: progress.map(p => ({
        moduleId: p.moduleId,
        completed: p.completed,
        updatedAt: p.updatedAt,
        isRecentActivity: new Date(p.updatedAt) > weekAgo
      }))
    });
    
    const recentActivity = progress.filter(p => {
      return new Date(p.updatedAt) > weekAgo;
    }).length;
    
    return {
      averageScore: completedProgress.length 
        ? completedProgress.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedProgress.length 
        : 0,
      totalTimeSpent: progress.reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0),
      completedCount: completedProgress.length,
      inProgressCount,
      totalStarted: progress.length,
      // Use reading level from profile if available, otherwise fallback to calculation
      readingLevel: profileReadingLevel !== null && profileReadingLevel !== undefined 
        ? profileReadingLevel 
        : completedProgress.length > 0 
          ? Math.min(10, Math.max(1, Math.round(
              (completedProgress.length * 0.3) + 
              (completedProgress.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedProgress.length * 0.07)
            )))
          : 1,
      // Recent activity (modules worked on in last 7 days)
      recentActivity,
    };
  }, [progress, profileReadingLevel]);
};

interface AnalyticsDashboardProps {
  metrics: ReturnType<typeof useProgressMetrics>;
  profile?: any;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ metrics, profile }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="h-5 w-5" />
        Module Overview
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Reading Level */}
        {/* <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Reading Level</p>
          <p className="text-3xl font-bold text-accent">Level {metrics.readingLevel}</p>
        </div> */}
        
        {/* Average Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average Score</span>
            <span className="font-medium">{Math.round(metrics.averageScore)}%</span>
          </div>
          <Progress value={metrics.averageScore} variant={metrics.averageScore >= 80 ? 'high-score' : metrics.averageScore >= 60 ? 'medium-score' : metrics.averageScore > 0 ? 'low-score' : 'default'} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {metrics.averageScore >= 80 ? 'Excellent!' : 
             metrics.averageScore >= 60 ? 'Good work!' : 
             metrics.averageScore > 0 ? 'Keep improving!' : 'No scores yet'}
          </p>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{metrics.completedCount}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.inProgressCount}</p>
          </div>
        </div>
        
        {/* Time & Activity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Time</p>
            <p className="text-2xl font-bold text-purple-600">{Math.round(metrics.totalTimeSpent / 60)}h</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold text-orange-600">{metrics.recentActivity}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
); 