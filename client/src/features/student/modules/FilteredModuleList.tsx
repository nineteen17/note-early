'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useAllActiveModulesQuery } from '@/hooks/api/reading-modules';
import { useMyProgressQuery } from '@/hooks/api/student/progress/useMyProgressQuery';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ModuleGenre, ModuleLanguage, ModuleType, ModuleLevel, ReadingModuleDTO } from '@/types/api';
import { cn, getModuleTypeDisplayName } from '@/lib/utils';

interface FilteredModuleListProps {
  sortBy: 'newest' | 'oldest' | 'level-low' | 'level-high' | 'alphabetical' | 'title';
  filters: {
    type?: ModuleType;
    genre?: ModuleGenre;
    level?: ModuleLevel;
    language?: ModuleLanguage;
  };
  viewMode?: 'single' | 'grid';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Helper function to calculate progress percentage
const calculateProgressPercentage = (current: number | null | undefined, total: number): number => {
  if (!current || current <= 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
};

export const FilteredModuleList: React.FC<FilteredModuleListProps> = ({ 
  sortBy, 
  filters, 
  viewMode = 'single',
  searchQuery = '',
  onSearchChange
}) => {
  const router = useRouter();
  const { data: modules, isLoading: isLoadingModules } = useAllActiveModulesQuery();
  const { data: progressList, isLoading: isLoadingProgress } = useMyProgressQuery();

  // Create a map of progress by moduleId for quick lookup
  const progressMap = React.useMemo(() => {
    if (!progressList) return new Map();
    return progressList.reduce((map, progress) => {
      map.set(progress.moduleId, progress);
      return map;
    }, new Map());
  }, [progressList]);

  const isLoading = isLoadingModules || isLoadingProgress;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!modules?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Modules Available</h3>
          <p className="text-muted-foreground">
            There are no modules available at the moment. Please check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Apply filters and search
  const filteredModules = modules.filter((module: ReadingModuleDTO) => {
    // Apply search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (module.title?.toLowerCase() || '').includes(searchLower) ||
        (module.description?.toLowerCase() || '').includes(searchLower) ||
        (module.genre?.toLowerCase() || '').includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Apply other filters
    if (filters.type && module.type !== filters.type) return false;
    if (filters.genre && module.genre !== filters.genre) return false;
    if (filters.level && module.level !== filters.level) return false;
    if (filters.language && module.language !== filters.language) return false;
    return true;
  });

  // Apply sorting
  filteredModules.sort((a: ReadingModuleDTO, b: ReadingModuleDTO) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'level-low':
        return a.level - b.level;
      case 'level-high':
        return b.level - a.level;
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  if (filteredModules.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Matching Modules</h3>
          <p className="text-muted-foreground">
            No modules match your current filters. Try adjusting your filters to see more results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredModules.map((module: ReadingModuleDTO) => {
        const progress = progressMap.get(module.id);
        const progressPercentage = progress 
          ? calculateProgressPercentage(progress.highestParagraphIndexReached, module.paragraphCount)
          : 0;
        const isCompleted = progress?.completed || false;

        return (
          <Card key={module.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CardTitle className="text-lg font-semibold line-clamp-2">
                          {module.title}
                        </CardTitle>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{module.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md">
                      Level {module.level}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md">
                      {module.genre}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md">
                      {module.language === 'UK' ? 'British English' : 'American English'}
                    </span>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium",
                      module.type === 'curated' 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  )}>
                      {module.type === 'curated' ? '⭐ ' : '✨ '}{getModuleTypeDisplayName(module.type)}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {module.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Badge className="bg-success text-white flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </Badge>
                      ) : progressPercentage > 0 ? (
                        <Badge className="bg-secondary text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          In Progress
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground flex items-center gap-1">
                          Not Started
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/student/modules/${module.id}`)}
                      className="hover:opacity-80"
                    >
                      View Module
                    </Button>
                  </div>
                  <div className="h-2">
                    {progressPercentage > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={progressPercentage} 
                          className="h-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          {progressPercentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 