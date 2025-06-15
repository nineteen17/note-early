'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, PlusCircle, Info, AlertCircle, Filter, Search, X, BookOpen, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ReadingModuleDTO } from "@/types/api";
import type { ModuleGenre, ModuleLanguage, ModuleType, ModuleLevel } from '@/types/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { UpgradePlanDisplay } from '@/components/cta/UpgradePlanDisplay';
import { useCurrentSubscriptionQuery } from '@/hooks/api/admin/subscriptions/useCurrentSubscriptionQuery';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { useMyModulesQuery } from '@/hooks/api/admin/modules/useMyModulesQuery';
import { ModuleListDisplay } from './ModuleListDisplay';

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

const STORAGE_KEY_PUBLIC = 'admin-public-modules-filters';
const STORAGE_KEY_CUSTOM = 'admin-custom-modules-filters';
const STORAGE_KEY_ALL = 'admin-all-modules-filters';
const STORAGE_KEY_ACTIVE_TAB = 'admin-modules-active-tab';

// Helper function to apply filters and sorting
const applyFiltersAndSort = (modules: ReadingModuleDTO[] | undefined, filterState: FilterState): ReadingModuleDTO[] => {
  if (!modules) return [];

  // Apply filters and search
  const filteredModules = modules.filter((module: ReadingModuleDTO) => {
    // Apply search query
    if (filterState.search) {
      const searchLower = filterState.search.toLowerCase();
      const matchesSearch = 
        (module.title?.toLowerCase() || '').includes(searchLower) ||
        (module.description?.toLowerCase() || '').includes(searchLower) ||
        (module.genre?.toLowerCase() || '').includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Apply other filters
    if (filterState.type && module.type !== filterState.type) return false;
    if (filterState.genre && module.genre !== filterState.genre) return false;
    if (filterState.level && module.level !== filterState.level) return false;
    if (filterState.language && module.language !== filterState.language) return false;
    return true;
  });

  // Apply sorting
  filteredModules.sort((a: ReadingModuleDTO, b: ReadingModuleDTO) => {
    switch (filterState.sort) {
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

  return filteredModules;
};

// Filter and Search Component
interface FilterSearchProps {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  storageKey: string;
}

const FilterSearch: React.FC<FilterSearchProps> = ({
  filterState,
  setFilterState,
  storageKey,
}) => {
  const searchParams = useSearchParams();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Initialize state from URL params or localStorage
  useEffect(() => {
    // First check URL params (for shared links)
    const urlSort = searchParams.get('sort') as SortOption;
    const urlGenre = searchParams.get('genre') as ModuleGenre;
    const urlLevel = searchParams.get('level');
    const urlLanguage = searchParams.get('language') as ModuleLanguage;
    const urlSearch = searchParams.get('search');

    if (urlSort || urlGenre || urlLevel || urlLanguage || urlSearch) {
      setFilterState(prev => ({
        ...prev,
        sort: urlSort || prev.sort,
        genre: urlGenre || undefined,
        level: urlLevel ? parseInt(urlLevel) as ModuleLevel : undefined,
        language: urlLanguage || undefined,
        search: urlSearch || undefined,
      }));
    } else {
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsedState = JSON.parse(stored);
            setFilterState(prev => ({ ...prev, ...parsedState }));
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, [searchParams, storageKey, setFilterState]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filterState));
      } catch {
        // Ignore errors
      }
    }
  }, [filterState, storageKey]);

  const { sort: sortBy, type, ...filters } = filterState;

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
    setFilterState(prev => ({
      sort: 'newest',
      type: prev.type, // Keep the type filter as it's tab-specific
      genre: undefined,
      level: undefined,
      language: undefined,
    }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[180px] border-2 border-inputhover:text-foreground/80"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters & Sort
            {activeFilterCount > 0 && (
              <Badge 
                variant="default" 
                className="ml-2 px-2 py-0.5 text-xs bg-accent/20 text-accent border border-accent/30 rounded-full font-bold"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[400px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5" />
              Filters & Sort
            </DialogTitle>
            <DialogDescription>
              Customize how you view your modules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-6">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Options
              </h4>
              
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Genre
                  </Label>
                  <Select
                    value={filters.genre || 'all'}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, genre: value === 'all' ? undefined : value as ModuleGenre }))}
                  >
                    <SelectTrigger className="h-11">
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
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Level</Label>
                  <Select
                    value={filters.level?.toString() || 'all'}
                    onValueChange={(value) => setFilterState(prev => ({ ...prev, level: value === 'all' ? undefined : parseInt(value) as ModuleLevel }))}
                  >
                    <SelectTrigger className="h-11">
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
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => updateSort(value as SortOption)}
                  >
                    <SelectTrigger className="h-11">
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
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="default" 
                onClick={() => setIsFilterDialogOpen(false)}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
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
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search modules..."
          value={filterState.search || ''}
          onChange={(e) => setFilterState(prev => ({ ...prev, search: e.target.value || undefined }))}
          className="pl-10 h-11 border-2 border-primary/20 focus:border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 shadow-inner focus:shadow-lg transition-all duration-200"
          autoFocus={false}
        />
        {filterState.search && (
          <button
            onClick={() => setFilterState(prev => ({ ...prev, search: undefined }))}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const PublicModulesList = () => {
  const { data: modules, isLoading, error } = useActiveModulesQuery();
  const [filterState, setFilterState] = useState<FilterState>({
    sort: 'newest',
    type: 'curated', // Filter for curated modules only
    genre: undefined,
    level: undefined,
    language: undefined,
  });

  const filteredModules = applyFiltersAndSort(modules, filterState);

  // Handle empty states
  if (!isLoading && !error) {
    if (!modules || modules.length === 0) {
      return (
        <div>
          <FilterSearch 
            filterState={filterState}
            setFilterState={setFilterState}
            storageKey={STORAGE_KEY_PUBLIC}
          />
          <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
            <CardContent className="p-8 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                <BookOpen className="h-8 w-8 text-popover-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">No Public Modules Available</h3>
              <p className="text-muted-foreground leading-relaxed">
                There are no curated modules available at the moment. Please check back later.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (filteredModules.length === 0) {
      return (
        <div>
          <FilterSearch 
            filterState={filterState}
            setFilterState={setFilterState}
            storageKey={STORAGE_KEY_PUBLIC}
          />
          <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
            <CardContent className="p-8 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-popover-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">No Matching Modules</h3>
              <p className="text-muted-foreground leading-relaxed">
                No public modules match your current filters. Try adjusting your filters to see more results.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div>
      <FilterSearch 
        filterState={filterState}
        setFilterState={setFilterState}
        storageKey={STORAGE_KEY_PUBLIC}
      />
      <ModuleListDisplay modules={filteredModules} isLoading={isLoading} error={error} />
    </div>
  );
};

const CustomModulesList = () => {
  const router = useRouter();
  const { data: modules, isLoading, error } = useMyModulesQuery();
  const [filterState, setFilterState] = useState<FilterState>({
    sort: 'newest',
    type: 'custom', // Filter for custom modules only
    genre: undefined,
    level: undefined,
    language: undefined,
  });

  const filteredModules = applyFiltersAndSort(modules, filterState);

  // Handle empty states
  if (!isLoading && !error) {
    if (!modules || modules.length === 0) {
      return (
        <div>
          <FilterSearch 
            filterState={filterState}
            setFilterState={setFilterState}
            storageKey={STORAGE_KEY_CUSTOM}
          />
          <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
            <CardContent className="p-8 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                <Plus className="h-8 w-8 text-popover-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">No Custom Modules Yet</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                You haven't created any custom modules yet. Create your first module to get started!
              </p>
              <Button 
                onClick={() => router.push('/admin/modules/create')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Module
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (filteredModules.length === 0) {
      return (
        <div>
          <FilterSearch 
            filterState={filterState}
            setFilterState={setFilterState}
            storageKey={STORAGE_KEY_CUSTOM}
          />
          <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
            <CardContent className="p-8 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-popover-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">No Matching Modules</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                No custom modules match your current filters. Try adjusting your filters to see more results.
              </p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/admin/modules/create')}
                className="border-2 border-dashed border-primary/30 text-popover-foreground hover:bg-primary/10 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Module
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div>
      <FilterSearch 
        filterState={filterState}
        setFilterState={setFilterState}
        storageKey={STORAGE_KEY_CUSTOM}
      />
      <ModuleListDisplay modules={filteredModules} isLoading={isLoading} error={error} />
    </div>
  );
};

const AllModulesList = () => {
    const router = useRouter();
    // Fetch both sets of data
    const { data: publicModules, isLoading: isLoadingPublic, error: errorPublic } = useActiveModulesQuery();
    const { data: customModules, isLoading: isLoadingCustom, error: errorCustom } = useMyModulesQuery();

    const [filterState, setFilterState] = useState<FilterState>({
      sort: 'newest',
      type: undefined,
      genre: undefined,
      level: undefined,
      language: undefined,
    });

    // Combine loading and error states (prioritize showing error)
    const isLoading = isLoadingPublic || isLoadingCustom;
    const error = errorPublic || errorCustom;

    // Combine modules only if both loaded successfully, ensuring type safety
    const combinedModules: ReadingModuleDTO[] | undefined = React.useMemo(() => {
        if (isLoading || error) {
            return undefined; // Return undefined if loading or error
        }
        // Create a Map explicitly typed
        const modulesMap = new Map<string, ReadingModuleDTO>();
        // Add public modules
        (publicModules || []).forEach(module => modulesMap.set(module.id, module));
        // Add custom modules (will overwrite public ones with the same ID if any)
        (customModules || []).forEach(module => modulesMap.set(module.id, module));
        // Convert map values back to an array
        return Array.from(modulesMap.values());
    }, [publicModules, customModules, isLoading, error]); // Dependencies for useMemo

    const filteredModules = applyFiltersAndSort(combinedModules, filterState);

    // Handle empty states
    if (!isLoading && !error) {
      if (!combinedModules || combinedModules.length === 0) {
        return (
          <div>
            <FilterSearch 
              filterState={filterState}
              setFilterState={setFilterState}
              storageKey={STORAGE_KEY_ALL}
            />
            <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                  <BookOpen className="h-8 w-8 text-popover-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">No Modules Available</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  There are no modules available at the moment. Create your first custom module to get started!
                </p>
                <Button 
                  onClick={() => router.push('/admin/modules/create')}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Module
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      if (filteredModules.length === 0) {
        return (
          <div>
            <FilterSearch 
              filterState={filterState}
              setFilterState={setFilterState}
              storageKey={STORAGE_KEY_ALL}
            />
            <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg w-fit mx-auto mb-6">
                  <AlertCircle className="h-8 w-8 text-popover-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">No Matching Modules</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  No modules match your current filters. Try adjusting your filters to see more results.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setFilterState({
                      sort: 'newest',
                      type: undefined,
                      genre: undefined,
                      level: undefined,
                      language: undefined,
                    })}
                    className="border-2 border-dashed border-primary/30 text-popover-foreground hover:bg-primary/10 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    onClick={() => router.push('/admin/modules/create')}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Module
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    return (
        <div>
          <FilterSearch 
            filterState={filterState}
            setFilterState={setFilterState}
            storageKey={STORAGE_KEY_ALL}
          />
          {/* Pass the filtered and sorted array */}
          <ModuleListDisplay modules={filteredModules} isLoading={isLoading} error={error} />
        </div>
      );
  };

export function ModulesFeature() {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { 
    data: currentSubscriptionData, 
    isLoading: isLoadingSubscription, 
    isError: isErrorSubscription, 
    error: subscriptionError 
  } = useCurrentSubscriptionQuery();
  
  // Fetch custom modules data needed for free tier limit check
  const { 
    data: myModules, 
    isLoading: isLoadingMyModules, 
    /* error: errorMyModules // Handle error display elsewhere if needed */ 
  } = useMyModulesQuery();

  // Combine loading states
  const isLoading = isLoadingSubscription || isLoadingMyModules;

  // Extract plan/subscription data
  const currentPlan = currentSubscriptionData?.plan;
  const currentSubscription = currentSubscriptionData?.subscription;
  const userPlanTier = currentPlan?.tier ?? 'free'; // Default to 'free' if plan is missing
  const customModuleLimit = currentPlan?.customModuleLimit ?? 0;
  const isActivePaidSub = (userPlanTier === 'home' || userPlanTier === 'pro') && (currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing');

  // --- Determine if user CAN create modules (based on plan config) ---
  const canPotentiallyCreate = userPlanTier !== 'free' || customModuleLimit > 0;

  // --- Determine if user is CURRENTLY at their limit --- 
  let isLimitReached = false;
  let currentModuleCount = 0;
  if (isLoading) {
    // Can't determine limit while loading
    isLimitReached = true; 
  } else if (userPlanTier === 'free') {
    // Free tier: Check total modules created against plan limit
    currentModuleCount = myModules?.length ?? 0;
    isLimitReached = currentModuleCount >= customModuleLimit;
  } else if (isActivePaidSub) {
    // Active Paid tier: Check monthly counter against plan limit
    currentModuleCount = currentSubscription?.customModulesCreatedThisPeriod ?? 0;
    isLimitReached = currentModuleCount >= customModuleLimit;
  } else {
    // Inactive paid subscription or error state
    isLimitReached = true; // Treat as limit reached if sub inactive/error
  }

  // --- Determine if the "Create" button and "My Modules" tab should be ACTIVE ---
  // User must have potential to create AND not be loading AND (be paid OR be free under limit)
  const showCreateFeatures = canPotentiallyCreate && !isLoading && (isActivePaidSub || userPlanTier === 'free');

  const handleCreateClick = () => {
    if (userPlanTier === 'free' && isLimitReached) {
      setShowUpgradeModal(true);
    } else if (!isLimitReached) {
      router.push('/admin/modules/create');
    }
  };

  // Initialize active tab from localStorage with fallback to "public"
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
        return stored || "public";
      } catch {
        return "public";
      }
    }
    return "public";
  });

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, value);
      } catch {
        // Ignore errors
      }
    }
  };

  // Skeleton Loading State - Match the actual card layout
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Tabs skeleton */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-11 w-[300px] rounded-lg" />
          <Skeleton className="h-11 w-[120px] rounded-lg" />
        </div>
        
        {/* Filter skeleton */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 w-[120px] rounded-lg" />
                <Skeleton className="h-10 w-[100px] rounded-lg" />
                <Skeleton className="h-10 w-[100px] rounded-lg" />
                <Skeleton className="h-10 w-[100px] rounded-lg" />
              </div>
              <Skeleton className="h-10 w-[280px] rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Module cards skeleton - matches ModuleListDisplay */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error State (prioritize subscription error)
  if (isErrorSubscription) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Subscription</AlertTitle>
            <AlertDescription>
                {subscriptionError?.message || "Could not load your subscription details."}
            </AlertDescription>
        </Alert>
    );
  }
  
  // --- Render Component ---
  return (
    <>
        {/* Display Custom Module Usage - Show if user can potentially create */} 
        {/* {canPotentiallyCreate && (
          <p className="text-sm text-muted-foreground font-medium mb-4">
            {userPlanTier === 'free' 
              ? `Total custom modules created: ${currentModuleCount} / ${customModuleLimit}` 
              : `${currentPlan?.interval === 'month' ? 'Monthly' : 'Yearly'} custom modules created: ${currentModuleCount} / ${customModuleLimit}`}
            {isLimitReached ? ' (Limit Reached)' : ''}
          </p>
        )} */}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-2 border-primary/10 shadow-lg">
          <TabsTrigger 
            value="public"
            className=""
          >
            Public
          </TabsTrigger>
           {/* Enable tab if user can potentially create and meets conditions */}
          <TabsTrigger 
            value="custom" 
            disabled={!showCreateFeatures} 
            className=""
          >
             My Modules 
             {!showCreateFeatures && <Lock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />} 
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className=""
          >
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-4">
          <PublicModulesList />
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {/* Show content if user can potentially create and meets conditions */} 
          {showCreateFeatures ? (
            <CustomModulesList />
          ) : (
            <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
                <CardHeader className="pb-6 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b-2 border-primary/10">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg">
                            <Lock className="h-5 w-5 text-popover-foreground" />
                        </div>
                        {userPlanTier === 'free' ? 'Feature Not Available' : 'Upgrade Required'} 
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    {userPlanTier === 'free' 
                      ? <p className="text-muted-foreground leading-relaxed">Creating custom modules requires a paid subscription.</p>
                      : <UpgradePlanDisplay currentPlan={userPlanTier} />
                    }
                </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
            <AllModulesList />
        </TabsContent>
      </Tabs>

    {/* Upgrade Modal */}
    <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5" />
            Upgrade Required
          </DialogTitle>
          <DialogDescription>
            You have reached the custom module limit for the free plan.
          </DialogDescription>
        </DialogHeader>
        <UpgradePlanDisplay currentPlan={'free'} />
        <DialogFooter>
           <DialogClose asChild>
             <Button 
               variant="outline"
               className="border-2 border-dashed border-primary/30 text-popover-foreground hover:bg-primary/10 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-200"
             >
               Close
             </Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
} 