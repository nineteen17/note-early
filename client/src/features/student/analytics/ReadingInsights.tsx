'use client';

import React, { useState } from 'react';
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
  PieChart,
  Calendar,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { useStudentActivityQuery } from '@/hooks/api/student/progress/useStudentActivityQuery';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { StudentProgressSchema } from '@/types/api';

interface ReadingStrengths {
  category: string;
  score: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReadingPattern {
  timeOfDay: string;
  percentage: number;
  description: string;
}

interface ImprovementArea {
  category: string;
  currentLevel: number;
  targetLevel: number;
  description: string;
}

interface GenreStats {
  genre: string;
  count: number;
  percentage: number;
  averageScore: number;
  totalTimeSpent: number;
  completed: boolean;
  totalModules: number;
}

interface TimeStats {
  timeOfDay: string;
  sessions: number;
  submissions: number;
  completions: number;
  total: number;
}

interface PieLabelProps {
  genre: string;
  percentage: number;
}

interface ActivityData {
  date: string;
  modulesActive: number;
  modulesCompleted: number;
  timeSpent: number;
  averageScore: number;
  lastActivity: string;
}

interface ActivityResponse {
  progressByDay: ActivityData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReadingInsights: React.FC = () => {
  const { data: progress = [], isLoading: progressLoading } = useMyProgressQuery();
  const { data: activityData, isLoading: activityLoading } = useStudentActivityQuery();
  const { data: modules = [], isLoading: modulesLoading } = useAllActiveModulesQuery();
  const [activeTab, setActiveTab] = useState('genres');
  
  const isLoading = progressLoading || activityLoading || modulesLoading;

  // Create a map of module data for quick lookup
  const moduleDataMap = React.useMemo(() => {
    if (!modules?.length) return new Map();
    return new Map(modules.map(module => [module.id, module]));
  }, [modules]);

  // Helper functions to get category and genre from moduleId
  const getCategoryFromModuleId = (moduleId: string): string => {
    const module = moduleDataMap.get(moduleId);
    return module?.category || 'Unknown';
  };

  const getGenreFromModuleId = (moduleId: string): string => {
    const module = moduleDataMap.get(moduleId);
    return module?.genre || 'Unknown';
  };

  const getStrengthDescription = (category: string, score: number): string => {
    const descriptions: { [key: string]: string[] } = {
      'Comprehension': [
        'Excellent understanding of complex texts',
        'Strong ability to grasp main ideas',
        'Good comprehension of key concepts'
      ],
      'Vocabulary': [
        'Exceptional word knowledge',
        'Strong vocabulary application',
        'Good understanding of new terms'
      ],
      'Critical Thinking': [
        'Outstanding analytical skills',
        'Strong ability to evaluate information',
        'Good critical analysis'
      ],
      'Reading Speed': [
        'Excellent reading pace',
        'Good balance of speed and comprehension',
        'Steady reading progress'
      ]
    };

    const index = score >= 90 ? 0 : score >= 75 ? 1 : 2;
    return descriptions[category]?.[index] || 'Good progress in this area';
  };

  const getCategoryIcon = (category: string): React.ComponentType<{ className?: string }> => {
    const icons: { [key: string]: React.ComponentType<{ className?: string }> } = {
      'Comprehension': Brain,
      'Vocabulary': BookOpen,
      'Critical Thinking': Lightbulb,
      'Reading Speed': Zap,
      'default': Target
    };
    return icons[category] || icons.default;
  };

  const getTimePatternDescription = (timeOfDay: string, ratio: number): string => {
    if (ratio >= 0.4) return 'Primary reading time';
    if (ratio >= 0.25) return 'Regular reading time';
    if (ratio >= 0.1) return 'Occasional reading time';
    return 'Rarely read during this time';
  };

  const getGenreIcon = (genre: string): React.ComponentType<{ className?: string }> => {
    const icons: { [key: string]: React.ComponentType<{ className?: string }> } = {
      'Fiction': BookOpen,
      'Non-Fiction': Bookmark,
      'Science': Lightbulb,
      'History': Clock,
      'default': BookOpen
    };
    return icons[genre] || icons.default;
  };

  const getImprovementDescription = (category: string, currentLevel: number): string => {
    const descriptions: { [key: string]: string[] } = {
      'Comprehension': [
        'Focus on summarizing key points after reading',
        'Practice identifying main ideas and supporting details',
        'Work on connecting ideas across different sections'
      ],
      'Vocabulary': [
        'Create a personal vocabulary journal',
        'Practice using new words in context',
        'Review and reinforce learned vocabulary'
      ],
      'Critical Thinking': [
        'Analyze different perspectives in texts',
        'Practice making inferences and predictions',
        'Evaluate the reliability of information'
      ],
      'Reading Speed': [
        'Practice timed reading exercises',
        'Work on reducing subvocalization',
        'Focus on expanding your reading span'
      ]
    };

    const index = currentLevel >= 80 ? 2 : currentLevel >= 60 ? 1 : 0;
    return descriptions[category]?.[index] || 'Continue regular practice';
  };

  const calculateReadingStrengths = React.useMemo((): ReadingStrengths[] => {
    if (!progress?.length || !modules?.length) return [];

    // Calculate average scores by category
    const categoryScores = (progress as StudentProgressSchema[]).reduce((acc: { [key: string]: number[] }, curr) => {
      if (curr.moduleId && typeof curr.score === 'number') {
        const category = getCategoryFromModuleId(curr.moduleId);
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(curr.score);
      }
      return acc;
    }, {});

    // Calculate averages and determine strengths
    return Object.entries(categoryScores)
      .map(([category, scores]) => {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return {
          category,
          score: average,
          description: getStrengthDescription(category, average),
          icon: getCategoryIcon(category),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [progress, modules]);

  const analyzeReadingPatterns = React.useMemo((): ReadingPattern[] => {
    if (!activityData?.progressByDay?.length) return [];

    const timeSlots = {
      'Morning (6AM-12PM)': 0,
      'Afternoon (12PM-6PM)': 0,
      'Evening (6PM-12AM)': 0,
      'Night (12AM-6AM)': 0
    };

    // Use actual reading session data from activityData
    (activityData as ActivityResponse).progressByDay.forEach((day) => {
      if (day.date && typeof day.modulesActive === 'number') {
        const hour = new Date(day.date).getHours();
        if (hour >= 6 && hour < 12) timeSlots['Morning (6AM-12PM)'] += day.modulesActive;
        else if (hour >= 12 && hour < 18) timeSlots['Afternoon (12PM-6PM)'] += day.modulesActive;
        else if (hour >= 18 && hour < 24) timeSlots['Evening (6PM-12AM)'] += day.modulesActive;
        else timeSlots['Night (12AM-6AM)'] += day.modulesActive;
      }
    });

    const total = Object.values(timeSlots).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];
    
    return Object.entries(timeSlots).map(([timeOfDay, count]) => ({
      timeOfDay,
      percentage: (count / total) * 100,
      description: getTimePatternDescription(timeOfDay, count / total)
    }));
  }, [activityData]);

  const analyzeGenres = React.useMemo((): GenreStats[] => {
    if (!modules?.length) return [];

    // Get all unique genres from modules
    const allGenres = Array.from(new Set(modules.map(module => module.genre || 'Unknown')));
    
    // Initialize stats for all genres
    const genreStats = allGenres.reduce((acc: { [key: string]: any }, genre) => {
      acc[genre] = {
        count: 0,
        totalScore: 0,
        totalTime: 0,
        completed: false,
        totalModules: 0
      };
      return acc;
    }, {});

    // Count total modules per genre
    modules.forEach(module => {
      const genre = module.genre || 'Unknown';
      if (genreStats[genre]) {
        genreStats[genre].totalModules++;
      }
    });

    // Update stats with completed modules
    if (progress?.length) {
      const completedModules = progress.filter(p => p.completed && p.moduleId);
      completedModules.forEach(curr => {
        const genre = getGenreFromModuleId(curr.moduleId) || 'Unknown';
        if (genreStats[genre]) {
          genreStats[genre].count++;
          genreStats[genre].totalScore += curr.score || 0;
          genreStats[genre].totalTime += curr.timeSpentMinutes || 0;
          genreStats[genre].completed = true;
        }
      });
    }
    
    return Object.entries(genreStats)
      .map(([genre, stats]: [string, any]) => ({
        genre,
        count: stats.count,
        percentage: stats.totalModules > 0 ? (stats.count / stats.totalModules) * 100 : 0,
        averageScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
        totalTimeSpent: stats.totalTime,
        completed: stats.completed,
        totalModules: stats.totalModules
      }))
      .sort((a, b) => b.count - a.count);
  }, [progress, modules]);

  const analyzeTimePatterns = React.useMemo((): TimeStats[] => {
    if (!activityData?.progressByDay?.length) return [];

    const timeSlots = {
      'Morning (6AM-12PM)': { sessions: 0, submissions: 0, completions: 0 },
      'Afternoon (12PM-6PM)': { sessions: 0, submissions: 0, completions: 0 },
      'Evening (6PM-12AM)': { sessions: 0, submissions: 0, completions: 0 },
      'Night (12AM-6AM)': { sessions: 0, submissions: 0, completions: 0 }
    };

    (activityData as ActivityResponse).progressByDay.forEach((day) => {
      if (day.date) {
        const hour = new Date(day.date).getHours();
        let timeSlot: keyof typeof timeSlots;
        
        if (hour >= 6 && hour < 12) timeSlot = 'Morning (6AM-12PM)';
        else if (hour >= 12 && hour < 18) timeSlot = 'Afternoon (12PM-6PM)';
        else if (hour >= 18 && hour < 24) timeSlot = 'Evening (6PM-12AM)';
        else timeSlot = 'Night (12AM-6AM)';

        timeSlots[timeSlot].sessions += day.modulesActive || 0;
        timeSlots[timeSlot].submissions += day.modulesCompleted || 0;
        timeSlots[timeSlot].completions += day.modulesCompleted || 0;
      }
    });

    return Object.entries(timeSlots).map(([timeOfDay, stats]) => ({
      timeOfDay,
      ...stats,
      total: stats.sessions + stats.submissions + stats.completions
    }));
  }, [activityData]);

  const analyzeProgressOverTime = React.useMemo(() => {
    if (!progress?.length) return [];

    const sortedProgress = [...(progress as StudentProgressSchema[])]
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .map(p => ({
        date: new Date(p.updatedAt).toLocaleDateString(),
        score: p.score || 0,
        timeSpent: p.timeSpentMinutes || 0
      }));

    return sortedProgress;
  }, [progress]);

  const identifyImprovementAreas = (): ImprovementArea[] => {
    if (!progress.length) return [];

    const categories = ['Comprehension', 'Vocabulary', 'Critical Thinking', 'Reading Speed'];
    const currentLevels = categories.map(category => {
      const categoryProgress = (progress as StudentProgressSchema[]).filter((p: any) => p.category === category);
      return categoryProgress.length 
        ? categoryProgress.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / categoryProgress.length
        : 0;
    });

    return categories.map((category, index) => ({
      category,
      currentLevel: currentLevels[index],
      targetLevel: Math.min(100, currentLevels[index] + 15),
      description: getImprovementDescription(category, currentLevels[index])
    }));
  };

  // Use the memoized values directly
  const strengths = calculateReadingStrengths;
  const patterns = analyzeReadingPatterns;
  const improvements = identifyImprovementAreas();
  const genres = analyzeGenres;
  const timePatterns = analyzeTimePatterns;
  const progressOverTime = analyzeProgressOverTime;

  const isEmpty = !genres.length && !timePatterns.length && !progressOverTime.length;

  if (isLoading) {
    return (
      <div className="sticky top-0 z-50 bg-background border-b">
        <Card className="w-full border-0 rounded-none shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Reading Insights
            </CardTitle>
        </CardHeader>
          <CardContent className="pt-0">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="sticky top-0 z-50 bg-background border-b">
        <Card className="w-full border-0 rounded-none shadow-none">
          <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Reading Insights
          </CardTitle>
        </CardHeader>
          <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reading Data Yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Start reading modules to see your insights and progress over time.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <Card className="w-full border-0 rounded-none shadow-none">
        <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Reading Insights
        </CardTitle>
      </CardHeader>
        <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="genres" className="flex items-center gap-2 py-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Genres</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-2 py-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 py-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="genres" className="space-y-4">
              {genres.length > 0 ? (
                <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                    data={genres}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        unit="%" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="genre" 
                        width={150}
                        tick={{ fontSize: 14 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                          if (name === 'percentage') {
                            const data = props.payload;
                            return [
                              `${data.count} of ${data.totalModules} modules (${value.toFixed(1)}%)`,
                              'Completion Rate'
                            ];
                          }
                          return [value, name];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="percentage" 
                        name="Percentage"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        animationDuration={1500}
                        animationBegin={0}
                  >
                    {genres.map((entry, index) => (
                          <Cell 
                            key={entry.genre} 
                            fill={entry.completed ? "hsl(var(--success))" : "hsl(var(--accent))"}
                            style={{ fill: entry.completed ? "hsl(var(--success))" : "hsl(var(--accent))" }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
              </ResponsiveContainer>
            </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Genre Data</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Complete some reading modules to see your genre preferences.
                  </p>
                </div>
              )}
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
              {timePatterns.length > 0 ? (
                <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timePatterns}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                  <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timeOfDay" 
                        tick={{ fontSize: 14 }}
                        tickFormatter={(value) => value.split(' ')[0]}
                      />
                  <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'sessions' ? 'Active Sessions' :
                          name === 'submissions' ? 'Submissions' :
                          name === 'completions' ? 'Completions' : name
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={(value: string) => <span className="text-sm">{value}</span>}
                      />
                  <Bar dataKey="sessions" stackId="a" fill="#8884d8" name="Active Sessions" />
                  <Bar dataKey="submissions" stackId="a" fill="#82ca9d" name="Submissions" />
                  <Bar dataKey="completions" stackId="a" fill="#ffc658" name="Completions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Time Data</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Start reading modules to see your reading time patterns.
                  </p>
                </div>
              )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
              {progressOverTime.length > 0 ? (
                <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={progressOverTime}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                  <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 14 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'score' ? `${value}%` : `${value} min`,
                          name === 'score' ? 'Score' : 'Time Spent'
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={(value: string) => <span className="text-sm">{value}</span>}
                      />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    stroke="#8884d8"
                    name="Score"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="timeSpent"
                    stroke="#82ca9d"
                    name="Time (min)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Progress Data</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Complete some reading modules to see your progress over time.
                </p>
              </div>
              )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  );
};

export default ReadingInsights; 