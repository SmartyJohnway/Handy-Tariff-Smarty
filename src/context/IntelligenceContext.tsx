﻿import React, { createContext, useContext, useState, useMemo } from 'react';
import type { UnifiedTariff } from '@/models/unified';

// Defines the shape of the state for the Tariff Intelligence page
interface IntelligenceState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  activeHts: string;
  setActiveHts: (hts: string) => void;

  isSearchLoading: boolean;
  setIsSearchLoading: (loading: boolean) => void;

  searchError: string | null;
  setSearchError: (error: string | null) => void;

  tariffData: Partial<UnifiedTariff> | null;
  setTariffData: (data: Partial<UnifiedTariff> | null) => void;

  adcvdCountryList: any[];
  setAdcvdCountryList: (list: any[]) => void;

  idsLinks: any[];
  setIdsLinks: (links: any[]) => void;

  adcvdUpdatedAt: string | null;
  setAdcvdUpdatedAt: (date: string | null) => void;
}

const IntelligenceContext = createContext<IntelligenceState | undefined>(undefined);

export const IntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeHts, setActiveHts] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tariffData, setTariffData] = useState<Partial<UnifiedTariff> | null>(null);
  const [adcvdCountryList, setAdcvdCountryList] = useState<any[]>([]);
  const [idsLinks, setIdsLinks] = useState<any[]>([]);
  const [adcvdUpdatedAt, setAdcvdUpdatedAt] = useState<string | null>(null);

  const value = useMemo(() => ({
    searchTerm, setSearchTerm,
    activeHts, setActiveHts,
    isSearchLoading, setIsSearchLoading,
    searchError, setSearchError,
    tariffData, setTariffData,
    adcvdCountryList, setAdcvdCountryList,
    idsLinks, setIdsLinks,
    adcvdUpdatedAt, setAdcvdUpdatedAt,
  }), [
    searchTerm,
    activeHts,
    isSearchLoading,
    searchError,
    tariffData,
    adcvdCountryList,
    idsLinks,
    adcvdUpdatedAt,
  ]);

  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
};

export const useIntelligence = (): IntelligenceState => {
  const context = useContext(IntelligenceContext);
  if (context === undefined) {
    throw new Error('useIntelligence must be used within an IntelligenceProvider');
  }
  return context;
};
