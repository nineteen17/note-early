'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { HomeHero } from './HomeHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Trophy } from 'lucide-react';
import ActivityCalendar from 'react-activity-calendar';
import Link from 'next/link';

// Hooks
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useLatestModuleWithDetailsQuery } from '@/hooks/api/student/progress/useLatestModuleWithDetailsQuery';
import { useStudentActivityQuery } from '@/hooks/api/student/progress/useStudentActivityQuery';

// Types
interface CalendarDay {
  date: string;
  count: number;
  level: number;
}

interface DayActivity {
  started: number;
  completed: number;
}

// Constants
const CALENDAR_CONFIG = {
  blockSize: 12,
  blockMargin: 2,
  blockRadius: 2,
  fontSize: 12,
  maxLevel: 5, // Reduced from 8 to 5
  weekStart: 0, // Sunday
} as const;

const CALENDAR_THEME = {
  light: [
    'hsl(var(--muted))',  // Level 0: No activity
    '#4b5563',            // Level 1: Started 1 module (dark gray)
    '#6b7280',            // Level 2: Started 2+ modules (lighter gray)
    '#196127',            // Level 3: Completed 1 module (dark green)
    '#239a3b',            // Level 4: Completed 2-4 modules (medium green)
    '#7bc96f'             // Level 5: Completed 5+ modules (light green)
  ],
  dark: [
    'hsl(var(--border))', // Level 0: No activity
    '#4b5563',            // Level 1: Started 1 module (dark gray)
    '#6b7280',            // Level 2: Started 2+ modules (lighter gray)
    '#196127',            // Level 3: Completed 1 module (dark green)
    '#239a3b',            // Level 4: Completed 2-4 modules (medium green)
    '#26a641'             // Level 5: Completed 5+ modules (light green)
  ],
};

// Utility Functions
const getCurrentYear = () => new Date().getFullYear();

const getYearDateRange = (year: number) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { startOfYear, endOfYear, totalDays };
};

const calculateActivityLevel = (started: number, completed: number): number => {
  // Priority: Completed modules always override started modules
  if (completed > 0) {
    if (completed >= 5) return 5;      // Level 5: 5+ completed (dark green)
    if (completed >= 2) return 4;      // Level 4: 2-4 completed (medium green)  
    return 3;                          // Level 3: 1 completed (light green)
  } else if (started > 0) {
    if (started >= 2) return 2;        // Level 2: 2+ started (darker gray)
    return 1;                          // Level 1: 1 started (light gray)
  }
  return 0; // No activity
};

const generateEmptyCalendarYear = (year: number): CalendarDay[] => {
  const { startOfYear, totalDays } = getYearDateRange(year);
  const emptyYear: CalendarDay[] = [];
  
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startOfYear);
    currentDate.setDate(startOfYear.getDate() + i);
    emptyYear.push({
      date: currentDate.toISOString().split('T')[0],
      count: 0,
      level: 0,
    });
  }
  
  return emptyYear;
};

// Custom Hooks
const useCalendarData = (activityData: any) => {
  return React.useMemo(() => {
    const currentYear = getCurrentYear();
    const { startOfYear, totalDays } = getYearDateRange(currentYear);
    
    // Create activity lookup map
    const activityMap = new Map<string, DayActivity>();
    
    if (activityData?.progressByDay && Array.isArray(activityData.progressByDay)) {
      activityData.progressByDay.forEach((day: any) => {
        if (day.date) {
          activityMap.set(day.date, {
            started: day.modulesActive || 0,
            completed: day.modulesCompleted || 0
          });
        }
      });
    }
    
    // Generate full year calendar data
    const calendarData: CalendarDay[] = [];
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startOfYear);
      currentDate.setDate(startOfYear.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      const dayActivity = activityMap.get(dateString) || { started: 0, completed: 0 };
      const totalCount = dayActivity.started + dayActivity.completed;
      const level = calculateActivityLevel(dayActivity.started, dayActivity.completed);
      
      calendarData.push({
        date: dateString,
        count: totalCount,
        level,
      });
    }
    
    return calendarData;
  }, [activityData]);
};

const useProgressMetrics = (progress: any[]) => {
  return React.useMemo(() => {
    const completedProgress = progress.filter(p => p.completed);
    const inProgressCount = progress.filter(p => !p.completed && p.highestParagraphIndexReached > 0).length;
    
    return {
      averageScore: progress.length 
        ? progress.reduce((acc, curr) => acc + (curr.score || 0), 0) / progress.length 
        : 0,
      totalTimeSpent: progress.reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0),
      completedCount: completedProgress.length,
      inProgressCount,
      totalStarted: progress.length,
      // Calculate reading level based on completed modules and average score
      readingLevel: completedProgress.length > 0 
        ? Math.min(10, Math.max(1, Math.round(
            (completedProgress.length * 0.3) + 
            (completedProgress.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedProgress.length * 0.07)
          )))
        : 1,
      // Recent activity (modules worked on in last 7 days)
      recentActivity: progress.filter(p => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(p.updatedAt) > weekAgo;
      }).length,
    };
  }, [progress]);
};

const useCalendarStats = (calendarData: CalendarDay[]) => {
  return React.useMemo(() => {
    const activeDays = calendarData.filter(day => day.count > 0).length;
    const totalActivities = calendarData.reduce((sum, day) => sum + day.count, 0);
    
    // Calculate current streak (consecutive days from today backwards)
    const sortedData = [...calendarData].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let currentStreak = 0;
    for (const day of sortedData) {
      if (day.count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return { activeDays, totalActivities, currentStreak };
  }, [calendarData]);
};

// Components
const ModuleCard: React.FC<{ latestModule: any }> = ({ latestModule }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Continue Reading
      </CardTitle>
    </CardHeader>
    <CardContent>
      {latestModule ? (
        <div className="space-y-4">
          <h3 className="font-medium">
            {latestModule.moduleTitle || `Module ${latestModule.moduleId}`}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {latestModule.moduleDescription || 'No description available'}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{latestModule.timeSpentMinutes || 0} minutes spent</span>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {(latestModule.highestParagraphIndexReached || 0) + (latestModule.completed ? 1 : 0)} / {latestModule.moduleDetails?.paragraphCount || 'N/A'}
                </span>
              </div>
              {latestModule.moduleDetails?.paragraphCount && (
                <Progress 
                  value={((latestModule.highestParagraphIndexReached || 0) + (latestModule.completed ? 1 : 0)) / latestModule.moduleDetails.paragraphCount * 100} 
                  className="h-2" 
                />
              )}
            </div>
          </div>
          
          <Button asChild className="w-full">
            <Link href={`/student/progress/${latestModule.moduleId}/details`}>
              {latestModule.completed ? 'Review Module' : 'Continue Module'}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No modules started yet</p>
          <Button asChild>
            <Link href="/modules">Browse Modules</Link>
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

const ProgressCard: React.FC<{ metrics: ReturnType<typeof useProgressMetrics> }> = ({ metrics }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="h-5 w-5" />
        Reading Progress
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Current Reading Level */}
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Current Reading Level</p>
          <p className="text-3xl font-bold text-accent">Level {metrics.readingLevel}</p>
        </div>
        
        {/* Average Score Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Average Score</span>
            <span className="font-medium">{Math.round(metrics.averageScore)}%</span>
          </div>
          <Progress value={metrics.averageScore} className="h-2" />
        </div>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{metrics.completedCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold">{metrics.inProgressCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Time</p>
            <p className="text-2xl font-bold">{Math.round(metrics.totalTimeSpent / 60)}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold">{metrics.recentActivity}</p>
          </div>
        </div>
        
        {/* Progress Summary */}
        {metrics.totalStarted > 0 && (
          <div className="pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {metrics.completedCount} of {metrics.totalStarted} modules completed 
              ({Math.round((metrics.completedCount / metrics.totalStarted) * 100)}% completion rate)
            </p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const CalendarStats: React.FC<{ stats: ReturnType<typeof useCalendarStats> }> = ({ stats }) => (
  <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
    <div className="text-center">
      <p className="text-muted-foreground">Active Days</p>
      <p className="font-semibold text-lg">{stats.activeDays}</p>
    </div>
    <div className="text-center">
      <p className="text-muted-foreground">Total Activities</p>
      <p className="font-semibold text-lg">{stats.totalActivities}</p>
    </div>
    <div className="text-center">
      <p className="text-muted-foreground">Current Streak</p>
      <p className="font-semibold text-lg">{stats.currentStreak}</p>
    </div>
  </div>
);

const ActivityCalendarCard: React.FC<{
  isLoading: boolean;
  hasError: boolean;
  calendarData: CalendarDay[];
}> = ({ isLoading, hasError, calendarData }) => {
  const stats = useCalendarStats(calendarData);
  const currentYear = getCurrentYear();
  const hasData = calendarData.length > 0;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Loading activity data...</div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-red-500">Error loading activity data</div>
      </div>
    );
  }
  
  const calendarProps = {
    theme: CALENDAR_THEME,
    colorScheme: 'light' as const,
    ...CALENDAR_CONFIG,
    labels: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      totalCount: hasData 
        ? `{{count}} activities in ${currentYear}`
        : 'No activities yet - start your reading journey!',
      legend: { less: 'Less', more: 'More' }
    },
  };
  
  return (
    <div className="space-y-4">
      {/* Calendar container with centered content */}
      <div className="flex flex-col items-center">
        <div className="overflow-x-auto">
          <ActivityCalendar
            data={hasData ? calendarData : generateEmptyCalendarYear(currentYear)}
            {...calendarProps}
          />
        </div>
        {!hasData && (
          <div className="text-center mt-4 p-4 bg-muted/50 rounded-lg max-w-md">
            <p className="text-sm text-muted-foreground mb-2">
              Your reading activity will appear here
            </p>
            <Button asChild size="sm">
              <Link href="/modules">Start Reading</Link>
            </Button>
          </div>
        )}
      </div>
      {/* Stats container - matches calendar width */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <CalendarStats stats={stats} />
        </div>
      </div>
    </div>
  );
};

// Main Component
export function StudentHome() {
  const profile = useAuthStore(state => state.profile);
  
  // Data fetching
  const { data: progress = [] } = useMyProgressQuery();
  const { data: latestModule } = useLatestModuleWithDetailsQuery();
  const { data: activityData, isLoading: activityLoading, error: activityError } = useStudentActivityQuery();
  
  // Computed data
  const calendarData = useCalendarData(activityData);
  const progressMetrics = useProgressMetrics(progress);
  
  if (!profile) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <HomeHero profile={profile} />
      
      {/* Top Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <ModuleCard latestModule={latestModule} />
        <ProgressCard metrics={progressMetrics} />
      </div>
      
      {/* Activity Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityCalendarCard
            isLoading={activityLoading}
            hasError={!!activityError}
            calendarData={calendarData}
          />
        </CardContent>
      </Card>
    </div>
  );
}