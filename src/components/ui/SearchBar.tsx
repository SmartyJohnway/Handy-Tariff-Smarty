import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Type Definitions ---

interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  className?: string;
}

// --- Main SearchBar Component ---

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearch,
  isLoading,
  className,
}) => {
  return (
    <div className={cn("mb-6", className)}>
      <Card className="rounded-2xl shadow-lg">
        <CardContent className="p-3">
          <form className="flex flex-col items-center gap-2 sm:flex-row sm:items-center" onSubmit={(e)=>{ e.preventDefault(); if (!isLoading) onSearch(); }}>
            <div className="relative w-full flex-grow">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter HTS code (HTS4/6/8/10/12)"
                className="w-full pl-10 h-10"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!isLoading) onSearch(); } }}
              />
            </div>
            <Button type="submit" size="sm" disabled={isLoading} className="w-full sm:w-auto h-10 px-4 text-sm">
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
