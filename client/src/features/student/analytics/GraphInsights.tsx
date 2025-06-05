'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useStudentActivityQuery } from '@/hooks/api/student/progress/useStudentActivityQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGenre } from '@/types/api';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Brain } from 'lucide-react';

interface GenreStats {
  genre: ModuleGenre;
  completed: number;
  inProgress: number;
}

interface TimeStats {
  timeOfDay: string;
  activeModules: number;
  completedParagraphs: number;
  completed: number;
}

interface ProgressData {
  date: string;
  score: number;
}

const GraphInsights: React.FC = () => {
  const { data: progress = [], isLoading: progressLoading } = useMyProgressQuery();
  const { data: activityData, isLoading: activityLoading } = useStudentActivityQuery();
  const { data: modules = [], isLoading: modulesLoading } = useAllActiveModulesQuery();
  
  const isLoading = progressLoading || activityLoading || modulesLoading;

  // Create a map of module data for quick lookup
  const moduleDataMap = React.useMemo(() => {
    if (!modules?.length) return new Map();
    return new Map(modules.map(module => [module.id, module]));
  }, [modules]);

  const getGenreFromModuleId = (moduleId: string): ModuleGenre => {
    const module = moduleDataMap.get(moduleId);
    return (module?.genre as ModuleGenre) || 'Custom';
  };

  const analyzeGenres = React.useMemo((): GenreStats[] => {
    // Create array with all genres
    const allGenres = [
      { genre: 'History' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Adventure' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Science' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Non-Fiction' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Fantasy' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Biography' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Mystery' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Science-Fiction' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Folktale' as ModuleGenre, completed: 0, inProgress: 0 },
      { genre: 'Custom' as ModuleGenre, completed: 0, inProgress: 0 }
    ];

    if (!progress?.length) return allGenres;

    // Map progress data to genres
    const genreStats = progress.reduce((acc, curr) => {
      if (curr.moduleId) {
        const genre = getGenreFromModuleId(curr.moduleId);
        const genreIndex = acc.findIndex(g => g.genre === genre);
        if (genreIndex !== -1) {
          if (curr.completed) {
            acc[genreIndex].completed++;
          } else {
            acc[genreIndex].inProgress++;
          }
        }
      }
      return acc;
    }, allGenres);

    return genreStats;
  }, [progress, moduleDataMap]);

  const analyzeTimePatterns = React.useMemo((): TimeStats[] => {
    if (!activityData?.progressByDay?.length) return [];

    const timeSlots = {
      'Morning (6AM-12PM)': { activeModules: 0, completedParagraphs: 0, completed: 0 },
      'Afternoon (12PM-6PM)': { activeModules: 0, completedParagraphs: 0, completed: 0 },
      'Evening (6PM-12AM)': { activeModules: 0, completedParagraphs: 0, completed: 0 },
      'Night (12AM-6AM)': { activeModules: 0, completedParagraphs: 0, completed: 0 }
    };

    activityData.progressByDay.forEach((day) => {
      if (day.date) {
        const hour = new Date(day.date).getHours();
        let timeSlot: keyof typeof timeSlots;
        
        if (hour >= 6 && hour < 12) timeSlot = 'Morning (6AM-12PM)';
        else if (hour >= 12 && hour < 18) timeSlot = 'Afternoon (12PM-6PM)';
        else if (hour >= 18 && hour < 24) timeSlot = 'Evening (6PM-12AM)';
        else timeSlot = 'Night (12AM-6AM)';

        timeSlots[timeSlot].activeModules += day.modulesActive || 0;
        timeSlots[timeSlot].completedParagraphs += day.modulesActive || 0;
        timeSlots[timeSlot].completed += day.modulesCompleted || 0;
      }
    });

    return Object.entries(timeSlots).map(([timeOfDay, stats]) => ({
      timeOfDay,
      ...stats
    }));
  }, [activityData]);

  const analyzeProgressOverTime = React.useMemo((): ProgressData[] => {
    if (!progress?.length) return [];

    // Create array with all months
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(i);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short' }),
        score: 0
      };
    });

    // Map progress data to months
    const progressByMonth = progress.reduce((acc, curr) => {
      const month = new Date(curr.updatedAt).toLocaleDateString('en-US', { month: 'short' });
      const monthIndex = allMonths.findIndex(m => m.date === month);
      if (monthIndex !== -1) {
        acc[monthIndex] = {
          date: month,
          score: curr.score || 0
        };
      }
      return acc;
    }, allMonths);

    return progressByMonth;
  }, [progress]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <Brain className="h-5 w-5" />
            Reading Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const genres = analyzeGenres;
  const timePatterns = analyzeTimePatterns;
  const progressOverTime = analyzeProgressOverTime;

  console.log('Genres:', genres);
  console.log('Time Patterns:', timePatterns);
  console.log('Progress Over Time:', progressOverTime);

  const genreChartConfig = {
    completed: {
      label: "Completed",
      color: "#4BAE4F",
    },
    inProgress: {
      label: "In Progress",
      color: "#B19CD9",
    },
  } satisfies ChartConfig;

  const timeChartConfig = {
    activeModules: {
      label: "Active Modules",
      color: "#B19CD9",
    },
    completedParagraphs: {
      label: "Completed Paragraphs",
      color: "#2EBBE7",
    },
    completed: {
      label: "Completed Modules",
      color: "#4BAE4F",
    },
  } satisfies ChartConfig;

  const progressChartConfig = {
    score: {
      label: "Score",
      color: "#2EBBE7",
    },
  } satisfies ChartConfig;

  console.log('Chart Config:', progressChartConfig);
  console.log('Success Color:', getComputedStyle(document.documentElement).getPropertyValue('--success'));
  console.log('Theme Light Color:', progressChartConfig.score.color);

  return (
    <Card className="w-full">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Brain className="h-5 w-5" />
          Reading Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Tabs defaultValue="genres" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10">
            <TabsTrigger value="genres" className="text-[10px] sm:text-xs py-2">Genre Distribution</TabsTrigger>
            <TabsTrigger value="time" className="text-[10px] sm:text-xs py-2">Time Patterns</TabsTrigger>
            <TabsTrigger value="progress" className="text-[10px] sm:text-xs py-2">Progress Over Time</TabsTrigger>
          </TabsList>

          <TabsContent value="genres" className="w-full mt-4">
            <div className="w-full h-[300px] sm:h-[400px] min-h-[300px] sm:min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={genres} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid vertical={false} stroke="#F5F5F5" />
                  <XAxis
                    dataKey="genre"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fill: "#666666", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: "#666666", fontSize: 11 }} 
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "var(--radius)",
                      color: "#666666",
                      fontSize: "11px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "#666666",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      fontSize: "11px"
                    }}
                    itemStyle={{
                      color: "#666666",
                      padding: "4px 0",
                      fontSize: "11px"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      color: "#666666", 
                      paddingTop: "60px",
                      fontSize: "11px"
                    }} 
                  />
                  <Bar 
                    dataKey="completed" 
                    fill="#4BAE4F" 
                    radius={4}
                    activeBar={{ fill: "#4BAE4F", opacity: 0.7 }}
                  />
                  <Bar 
                    dataKey="inProgress" 
                    fill="#B19CD9" 
                    radius={4}
                    activeBar={{ fill: "#B19CD9", opacity: 0.7 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="time" className="w-full mt-4">
            <div className="w-full h-[300px] sm:h-[400px] min-h-[300px] sm:min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={timePatterns} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid vertical={false} stroke="#F5F5F5" />
                  <XAxis
                    dataKey="timeOfDay"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fill: "#666666", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: "#666666", fontSize: 11 }} 
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "var(--radius)",
                      color: "#666666",
                      fontSize: "11px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "#666666",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      fontSize: "11px"
                    }}
                    itemStyle={{
                      color: "#666666",
                      padding: "4px 0",
                      fontSize: "11px"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      color: "#666666", 
                      paddingTop: "60px",
                      fontSize: "11px"
                    }} 
                  />
                  <Bar dataKey="completed" stackId="a" fill="#4BAE4F" radius={0} />
                  <Bar dataKey="completedParagraphs" stackId="a" fill="#2EBBE7" radius={0} />
                  <Bar dataKey="activeModules" stackId="a" fill="#B19CD9" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="w-full mt-4">
            <div className="w-full h-[300px] sm:h-[400px] min-h-[300px] sm:min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <LineChart
                  data={progressOverTime}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#F5F5F5" 
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "#F5F5F5" }}
                    tickMargin={8}
                    tick={{ fill: "#666666", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "#F5F5F5" }}
                    tick={{ fill: "#666666", fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "var(--radius)",
                      color: "#666666",
                      fontSize: "11px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ 
                      color: "#666666",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      fontSize: "11px"
                    }}
                    itemStyle={{
                      color: "#666666",
                      padding: "4px 0",
                      fontSize: "11px"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      color: "#666666", 
                      paddingTop: "60px",
                      fontSize: "11px"
                    }} 
                  />
                  <Line
                    dataKey="score"
                    type="monotone"
                    stroke="#2EBBE7"
                    strokeWidth={2}
                    dot={{ 
                      fill: "#2EBBE7", 
                      strokeWidth: 2,
                      r: 4
                    }}
                    activeDot={{ 
                      r: 6, 
                      fill: "#2EBBE7",
                      stroke: "#2EBBE7",
                      strokeWidth: 2
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GraphInsights;
