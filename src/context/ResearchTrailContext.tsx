import React, { createContext, useState, useContext, ReactNode } from 'react';

export type SearchTrailItem = {
  type: 'search';
  term: string;
  timestamp: Date;
};

export type ViewHtsTrailItem = {
  type: 'view_hts';
  hts: string;
  description: string;
  timestamp: Date;
};

export type TrailItem = SearchTrailItem | ViewHtsTrailItem;

interface ResearchTrailContextType {
  trail: TrailItem[];
  addTrailItem: (item: Omit<TrailItem, 'timestamp'>) => void;
  clearTrail: () => void;
}

const ResearchTrailContext = createContext<ResearchTrailContextType | undefined>(undefined);

export const useResearchTrail = () => {
  const context = useContext(ResearchTrailContext);
  if (!context) {
    throw new Error('useResearchTrail must be used within a ResearchTrailProvider');
  }
  return context;
};

interface ResearchTrailProviderProps {
  children: ReactNode;
}

export const ResearchTrailProvider = ({ children }: ResearchTrailProviderProps) => {
  const [trail, setTrail] = useState<TrailItem[]>([]);

  const addTrailItem = (item: Omit<TrailItem, 'timestamp'>) => {
    let newItem: TrailItem;
    if (item.type === 'search') {
      newItem = { ...item, timestamp: new Date() } as SearchTrailItem;
    } else { // item.type === 'view_hts'
      newItem = { ...item, timestamp: new Date() } as ViewHtsTrailItem;
    }
    // Avoid adding consecutive duplicates
    if (trail.length > 0) {
        const lastItem = trail[trail.length - 1];
        if (lastItem.type === newItem.type && 'term' in lastItem && 'term' in newItem && lastItem.term === newItem.term) return;
        if (lastItem.type === newItem.type && 'hts' in lastItem && 'hts' in newItem && lastItem.hts === newItem.hts) return;
    }
    setTrail(prevTrail => [newItem, ...prevTrail]);
  };

  const clearTrail = () => {
    setTrail([]);
  };

  const value = {
    trail,
    addTrailItem,
    clearTrail,
  };

  return <ResearchTrailContext.Provider value={value}>{children}</ResearchTrailContext.Provider>;
};
