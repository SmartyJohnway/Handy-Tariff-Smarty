import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { useNotifier } from '@/context/NotificationContext';
import { useResearchTrail, SearchTrailItem, ViewHtsTrailItem } from '@/context/ResearchTrailContext';
import { useHtsSearchQuery, HtsItem } from '@/hooks/queries/useHtsSearchQuery';
export type { HtsItem } from '@/hooks/queries/useHtsSearchQuery';

type Tab =
  | 'intelligence'
  | 'advanced-trends'
  | 'query'
  | 'hts'
  | 'ids'
  | 'sources'
  | 'federal-register'
  | 'federal-register2'
  | 'dataweb'
  | 'verifier'
  | 'translation'
  | 'charts';

interface SearchContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  htsSearchTerm: string;
  searchHtsCode: (code: string, description?: string) => void;
  performHtsSearch: (term: string) => Promise<void>;
  htsResults: HtsItem[];
  isHtsLoading: boolean;
  htsNavToken: number;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

const PUBLIC_TABS: Tab[] = [
  'intelligence',
  'advanced-trends',
  'hts',
  'ids',
  'sources',
  'federal-register',
  'federal-register2',
];

const sanitizeTab = (tab: Tab): Tab => (PUBLIC_TABS.includes(tab) ? tab : 'intelligence');

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t && (PUBLIC_TABS as string[]).includes(t)) return t as Tab;
      } catch {
        // ignore URL parsing errors
      }
    }
    return 'intelligence';
  });
  const setActiveTab = (tab: Tab) => setActiveTabState(sanitizeTab(tab));
  const [htsSearchTerm, setHtsSearchTerm] = useState('');
  const [htsNavToken, setHtsNavToken] = useState(0);
  const [htsResults, setHtsResults] = useState<HtsItem[]>([]);
  const [isHtsLoading, setIsHtsLoading] = useState(false);
  const [queryTerm, setQueryTerm] = useState<string | null>(null);

  const { addNotification } = useNotifier();
  const { addTrailItem } = useResearchTrail();

  const htsQuery = useHtsSearchQuery({
    term: queryTerm ?? '',
    enabled: Boolean(queryTerm),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      if (activeTab !== 'intelligence') {
        url.searchParams.delete('hts');
        url.searchParams.delete('term');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, [activeTab]);

  const searchHtsCode = (code: string, description = 'N/A') => {
    addTrailItem({
      type: 'view_hts',
      hts: code,
      description,
    } as Omit<ViewHtsTrailItem, 'timestamp'>);
    setHtsSearchTerm(code);
    setHtsNavToken(t => t + 1);
    setActiveTab('intelligence');
  };

  const performHtsSearch = useCallback(
    async (term: string) => {
      const termToSearch = term.trim();
      if (termToSearch.length < 2) {
        addNotification('Please enter at least two characters', 'info');
        return;
      }

      addTrailItem({ type: 'search', term: termToSearch } as Omit<SearchTrailItem, 'timestamp'>);
      setHtsSearchTerm(termToSearch);
      setQueryTerm(termToSearch);
    },
    [addNotification, addTrailItem]
  );

  useEffect(() => {
    if (!htsQuery.data) return;
    setHtsResults(htsQuery.data);
    addNotification(`查詢完成，共 ${htsQuery.data.length} 筆資料`, 'success');
  }, [htsQuery.data, addNotification]);

  useEffect(() => {
    if (!htsQuery.error) return;
    const message =
      htsQuery.error instanceof Error ? htsQuery.error.message : String(htsQuery.error);
    addNotification(`查詢失敗: ${message}`, 'error');
    setHtsResults([]);
  }, [htsQuery.error, addNotification]);

  useEffect(() => {
    setIsHtsLoading(Boolean(queryTerm) && htsQuery.isFetching);
  }, [queryTerm, htsQuery.isFetching]);

  const value = {
    activeTab,
    setActiveTab,
    htsSearchTerm,
    searchHtsCode,
    performHtsSearch,
    htsResults,
    isHtsLoading,
    htsNavToken,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};
