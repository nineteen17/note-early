'use client';

import React from 'react';
import ActivityCalendar from 'react-activity-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

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

interface ActivityCalendarComponentProps {
  activityData?: any;
  isLoading?: boolean;
  hasError?: boolean;
  showCard?: boolean;
  title?: string;
  className?: string;
}

// Constants
const CALENDAR_CONFIG = {
  blockSize: 12,
  blockMargin: 2,
  blockRadius: 2,
  fontSize: 12,
  maxLevel: 5,
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

const ActivityCalendarContent: React.FC<{
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
        <Skeleton className="h-32 w-full" />
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
      {/* Calendar container with horizontal scroll */}
      <div className="flex flex-col items-center">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[800px] max-w-[1000px] mx-auto">
            <ActivityCalendar
              data={hasData ? calendarData : generateEmptyCalendarYear(currentYear)}
              {...calendarProps}
            />
          </div>
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
        <div className="w-full max-w-[1000px]">
          <CalendarStats stats={stats} />
        </div>
      </div>
    </div>
  );
};

// Main Component
export const ActivityCalendarComponent: React.FC<ActivityCalendarComponentProps> = ({
  activityData,
  isLoading = false,
  hasError = false,
  showCard = true,
  title = "Activity Calendar",
  className = ""
}) => {
  const calendarData = useCalendarData(activityData);
  
  const content = (
    <ActivityCalendarContent
      isLoading={isLoading}
      hasError={hasError}
      calendarData={calendarData}
    />
  );
  
  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }
  
  return <div className={className}>{content}</div>;
};

export default ActivityCalendarComponent;