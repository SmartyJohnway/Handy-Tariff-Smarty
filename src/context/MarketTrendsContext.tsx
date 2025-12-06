import React, { createContext, useContext, useState, useMemo } from 'react';

/**
 * Defines the shape of the state shared between Quick and Advanced Market Trends modes.
 */
interface MarketTrendsState {
  // HTS codes being analyzed. Quick mode uses the first, Advanced mode can use multiple.
  hts: string[];
  setHts: (hts: string[]) => void;

  // Selected country ISO codes. An empty array means "All Countries".
  countryCodes: string[];
  setCountryCodes: (codes: string[]) => void;

  // Time period settings.
  period: { years: number; ytd: boolean };
  setPeriod: (period: { years: number; ytd: boolean }) => void;

  // Trade flow. Advanced mode will also support 'export' and 'balance'.
  flow: 'cons' | 'gen' | 'balance';
  setFlow: (flow: 'cons' | 'gen' | 'balance') => void;

  // Selected metrics. Quick mode uses the first, Advanced mode can use multiple.
  metrics: string[];
  setMetrics: React.Dispatch<React.SetStateAction<string[]>>;

  // Break out settings.
  breakout: { enabled: boolean; topN: number; year: string | null };
  setBreakout: (breakout: { enabled: boolean; topN: number; year: string | null }) => void;

}

const MarketTrendsContext = createContext<MarketTrendsState | undefined>(undefined);

export const MarketTrendsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hts, setHts] = useState<string[]>([]);
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [period, setPeriod] = useState({ years: 5, ytd: true });
  const [flow, setFlow] = useState<'cons' | 'gen' | 'balance'>('cons');
  const [metrics, setMetrics] = useState<string[]>(['quantity']);
  const [breakout, setBreakout] = useState<{ enabled: boolean; topN: number; year: string | null }>({ enabled: false, topN: 5, year: null });

  // useMemo to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    hts, setHts,
    countryCodes, setCountryCodes,
    period, setPeriod,
    flow, setFlow,
    metrics, setMetrics,
    breakout, setBreakout,
  }), [hts, countryCodes, period, flow, metrics, breakout]);

  return (
    <MarketTrendsContext.Provider value={value}>
      {children}
    </MarketTrendsContext.Provider>
  );
};

/**
 * Hook to use the Market Trends context.
 * Ensures it's used within a MarketTrendsProvider.
 */
export const useMarketTrends = (): MarketTrendsState => {
  const context = useContext(MarketTrendsContext);
  if (context === undefined) {
    throw new Error('useMarketTrends must be used within a MarketTrendsProvider');
  }
  return context;
};
