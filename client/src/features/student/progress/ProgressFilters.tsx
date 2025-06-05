'use client';

import React from 'react';
import { Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export type SortOption = 'recent' | 'oldest' | 'progress-high' | 'progress-low' | 'score-high' | 'score-low' | 'level-high' | 'level-low' | 'alphabetical';

export interface ProgressFilters {
  sort: SortOption;
  search?: string;
  levels?: number[];
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface ProgressFiltersProps {
  filterState: ProgressFilters;
  onFilterChange: (filters: ProgressFilters) => void;
}

export const ProgressFilters: React.FC<ProgressFiltersProps> = ({ filterState, onFilterChange }) => {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(filterState.search || '');
  const [selectedLevels, setSelectedLevels] = React.useState<number[]>(filterState.levels || []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFilterChange({ ...filterState, search: value });
  };

  const handleSortChange = (value: SortOption) => {
    onFilterChange({ ...filterState, sort: value });
  };

  const handleLevelChange = (value: string) => {
    const level = parseInt(value);
    const newLevels = selectedLevels.includes(level)
      ? selectedLevels.filter(l => l !== level)
      : [...selectedLevels, level];
    setSelectedLevels(newLevels);
  };

  const handleApplyFilters = () => {
    onFilterChange({ ...filterState, levels: selectedLevels });
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedLevels([]);
    onFilterChange({ sort: filterState.sort });
    setIsFilterOpen(false);
  };

  const hasActiveFilters = filterState.search || (filterState.levels && filterState.levels.length > 0);

  const getSortIcon = () => {
    switch (filterState.sort) {
      case 'progress-high':
      case 'score-high':
      case 'level-high':
        return <ArrowDown className="h-3 w-3" />;
      case 'progress-low':
      case 'score-low':
      case 'level-low':
        return <ArrowUp className="h-3 w-3" />;
      case 'alphabetical':
        return <ArrowUpDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getSortLabel = () => {
    switch (filterState.sort) {
      case 'recent':
        return 'Most Recent';
      case 'oldest':
        return 'Oldest First';
      case 'progress-high':
        return 'Highest Progress';
      case 'progress-low':
        return 'Lowest Progress';
      case 'score-high':
        return 'Highest Score';
      case 'score-low':
        return 'Lowest Score';
      case 'level-high':
        return 'Highest Level';
      case 'level-low':
        return 'Lowest Level';
      case 'alphabetical':
        return 'Alphabetical';
      default:
        return 'Sort';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-[320px] order-first sm:order-last">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-9"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1.5 h-6 w-6 p-0"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={filterState.sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="progress-high">
                <div className="flex items-center justify-between w-full">
                  <span>Progress</span>
                  <ArrowDown className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="progress-low">
                <div className="flex items-center justify-between w-full">
                  <span>Progress</span>
                  <ArrowUp className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="score-high">
                <div className="flex items-center justify-between w-full">
                  <span>Score</span>
                  <ArrowDown className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="score-low">
                <div className="flex items-center justify-between w-full">
                  <span>Score</span>
                  <ArrowUp className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="level-high">
                <div className="flex items-center justify-between w-full">
                  <span>Level</span>
                  <ArrowDown className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="level-low">
                <div className="flex items-center justify-between w-full">
                  <span>Level</span>
                  <ArrowUp className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
              <SelectItem value="alphabetical">
                <div className="flex items-center justify-between w-full">
                  <span>Alphabetical</span>
                  <ArrowUpDown className="h-3 w-3 ml-2 flex-shrink-0" />
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-[160px] h-9 bg-card border-input hover:text-foreground/80">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {hasActiveFilters && (
                  <Badge variant="accent" className="ml-2">
                    {filterState.levels?.length || 0} {filterState.search ? '+ search' : ''}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Level</h4>
                  <div className="flex flex-wrap gap-3">
                    {LEVELS.map((level) => (
                      <Button
                        key={level}
                        variant="outline"
                        size="sm"
                        onClick={() => handleLevelChange(level.toString())}
                        className={selectedLevels.includes(level) 
                          ? "bg-accent text-accent-foreground dark:text-accent hover:bg-accent/90 border-accent" 
                          : "bg-popover text-foreground hover:text-accent hover:border-accent border-input"
                        }
                      >
                        Level {level}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="default" onClick={handleApplyFilters}>
                    Apply
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterState.levels?.map((level) => (
          <Badge key={level} variant="accent" className="flex items-center gap-1">
            Level {level}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => {
                const newLevels = filterState.levels?.filter(l => l !== level) || [];
                onFilterChange({ ...filterState, levels: newLevels });
                setSelectedLevels(newLevels);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        {filterState.search && (
          <Badge variant="accent" className="flex items-center gap-1">
            Search: {filterState.search}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
}; 