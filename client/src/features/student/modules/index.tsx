 'use client';

import React, { useEffect, useState } from 'react';
import { FilteredModuleList } from './FilteredModuleList';
import { PageContainer } from '@/components/layout/PageContainer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { ModuleGenre, ModuleLanguage, ModuleType, ModuleLevel } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/PageHeader';

// Sort options type
type SortOption = 'newest' | 'oldest' | 'level-low' | 'level-high' | 'alphabetical' | 'title';

// Filter state interface
interface ModuleFilters {
  type?: ModuleType;
  genre?: ModuleGenre;
  level?: ModuleLevel;
  language?: ModuleLanguage;
}

interface FilterState extends ModuleFilters {
  sort: SortOption;
  search?: string;
}

const STORAGE_KEY = 'student-modules-filters';

const ModulesFeature = () => {
  const searchParams = useSearchParams();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // Initialize state from URL params or localStorage
  const [filterState, setFilterState] = useState<FilterState>(() => {
    // First check URL params (for shared links)
    const urlSort = searchParams.get('sort') as SortOption;
    const urlType = searchParams.get('type') as ModuleType;
    const urlGenre = searchParams.get('genre') as ModuleGenre;
    const urlLevel = searchParams.get('level');
    const urlLanguage = searchParams.get('language') as ModuleLanguage;
    const urlSearch = searchParams.get('search');

    if (urlSort || urlType || urlGenre || urlLevel || urlLanguage || urlSearch) {
      return {
        sort: urlSort || 'newest',
        type: urlType || undefined,
        genre: urlGenre || undefined,
        level: urlLevel ? parseInt(urlLevel) as ModuleLevel : undefined,
        language: urlLanguage || undefined,
        search: urlSearch || undefined,
      };
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore errors
      }
    }

    // Default state
    return {
      sort: 'newest',
      type: undefined,
      genre: undefined,
      level: undefined,
      language: undefined,
    };
  });

  // Save to localStorage and update URL whenever state changes
  useEffect(() => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
      } catch {
        // Ignore errors
      }
    }

    // Update URL for shareability
    const params = new URLSearchParams();
    if (filterState.sort !== 'newest') params.set('sort', filterState.sort);
    if (filterState.type) params.set('type', filterState.type);
    if (filterState.genre) params.set('genre', filterState.genre);
    if (filterState.level) params.set('level', filterState.level.toString());
    if (filterState.language) params.set('language', filterState.language);
    if (filterState.search) params.set('search', filterState.search);

    const queryString = params.toString();
    const newUrl = queryString ? `/student/modules?${queryString}` : '/student/modules';
    
    // Update URL without navigation
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newUrl);
    }
  }, [filterState]);

  const { sort: sortBy, ...filters } = filterState;

  // Genre options (excluding "Custom" as it's not a real genre for filtering)
  const genreOptions: ModuleGenre[] = [
    "History", "Adventure", "Science", "Non-Fiction", "Fantasy", 
    "Biography", "Mystery", "Science-Fiction", "Folktale"
  ];

  // Level options
  const levelOptions: ModuleLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const updateSort = (newSort: SortOption) => {
    setFilterState(prev => ({ ...prev, sort: newSort }));
  };

  const clearAllFilters = () => {
    setFilterState({
      sort: 'newest',
      type: undefined,
      genre: undefined,
      level: undefined,
      language: undefined,
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader 
          title="Reading Modules"
          description="Browse and start new reading modules. Filter by genre to find stories that interest you."
        />
        
        {/* Filter and Search Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-[180px] bg-card border-input hover:text-foreground/80"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters & Sort
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="ml-2 px-1.5 py-0.5 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[400px] max-h-[80vh] overflow-y-auto bg-background">
              <DialogHeader>
                <DialogTitle>Filters & Sort</DialogTitle>
                <DialogDescription>
                  Customize how you view your modules
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={filters.type || 'all'}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, type: value === 'all' ? undefined : value as ModuleType }))}
                  >
                    <SelectTrigger className="w-full bg-popover border-input text-foreground ">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="curated">Curated</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Genre</Label>
                  <Select
                    value={filters.genre || 'all'}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, genre: value === 'all' ? undefined : value as ModuleGenre }))}
                  >
                    <SelectTrigger className="w-full bg-popover border-input text-foreground">
                      <SelectValue placeholder="Filter by genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {genreOptions.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Level</Label>
                  <Select
                    value={filters.level?.toString() || 'all'}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, level: value === 'all' ? undefined : parseInt(value) as ModuleLevel }))}
                  >
                    <SelectTrigger className="w-full bg-popover border-input text-foreground">
                      <SelectValue placeholder="Filter by level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {levelOptions.map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sort By</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => updateSort(value as SortOption)}
                  >
                    <SelectTrigger className="w-full bg-popover border-input text-foreground">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="level-low">Level (Low to High)</SelectItem>
                      <SelectItem value="level-high">Level (High to Low)</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default" 
                    onClick={() => setIsFilterDialogOpen(false)}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      clearAllFilters();
                      setIsFilterDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              value={filterState.search || ''}
              onChange={(e) => setFilterState(prev => ({ ...prev, search: e.target.value || undefined }))}
              className="pl-8"
            />
            {filterState.search && (
              <button
                onClick={() => setFilterState(prev => ({ ...prev, search: undefined }))}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Module List */}
        <FilteredModuleList 
          sortBy={sortBy} 
          filters={filters} 
          viewMode={viewMode}
          searchQuery={filterState.search}
          onSearchChange={(query) => setFilterState(prev => ({ ...prev, search: query || undefined }))}
        />
      </div>
    </PageContainer>
  );
} 

export default ModulesFeature;