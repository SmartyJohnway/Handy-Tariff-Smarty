import React, { createContext, useContext, useState, useMemo } from 'react';
import type { NormalizedFRDoc } from '@/lib/frNormalize';

type DocLite = {
  document_number: string;
  title: string;
  type?: string;
  publication_date?: string;
  agencies?: any[];
  html_url?: string;
  body_html_url?: string | null;
  pdf_url?: string | null;
  public_inspection_pdf_url?: string | null;
  excerpts?: string[];
};

interface FederalRegisterState {
  term: string;
  setTerm: (term: string) => void;
  perPage: number;
  setPerPage: (perPage: number) => void;
  order: string;
  setOrder: (order: string) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  useAggregated: boolean;
  setUseAggregated: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFacets: string[];
  setSelectedFacets: React.Dispatch<React.SetStateAction<string[]>>;
  debugMode: boolean;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
  baseUri: string;
  setBaseUri: (baseUri: string) => void;
  dateStart: string;
  setDateStart: (dateStart: string) => void;
  dateEnd: string;
  setDateEnd: (dateEnd: string) => void;
  condAgencies: string;
  setCondAgencies: (condAgencies: string) => void;
  condTypes: string;
  setCondTypes: (condTypes: string) => void;
  condSections: string;
  setCondSections: (condSections: string) => void;
  condTopics: string;
  setCondTopics: (condTopics: string) => void;
  condAgencyQuery: string;
  setCondAgencyQuery: (condAgencyQuery: string) => void;
  condAgencySuggests: any[];
  setCondAgencySuggests: (condAgencySuggests: any[]) => void;
  condAgencySuggestOpen: boolean;
  setCondAgencySuggestOpen: (condAgencySuggestOpen: boolean) => void;
  condSectionQuery: string;
  setCondSectionQuery: (condSectionQuery: string) => void;
  condSectionSuggests: any[];
  setCondSectionSuggests: (condSectionSuggests: any[]) => void;
  condSectionSuggestOpen: boolean;
  setCondSectionSuggestOpen: (condSectionSuggestOpen: boolean) => void;
  condSectionSource: Array<{slug:string;name:string}>;
  setCondSectionSource: (condSectionSource: Array<{slug:string;name:string}>) => void;
  condSectionLoaded: boolean;
  setCondSectionLoaded: (condSectionLoaded: boolean) => void;
  condTopicQuery: string;
  setCondTopicQuery: (condTopicQuery: string) => void;
  condTopicSuggests: any[];
  setCondTopicSuggests: (condTopicSuggests: any[]) => void;
  condTopicSuggestOpen: boolean;
  setCondTopicSuggestOpen: (condTopicSuggestOpen: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  searchUrl: string;
  setSearchUrl: (searchUrl: string) => void;
  payload: any | null;
  setPayload: (payload: any | null) => void;
  results: DocLite[];
  setResults: (results: DocLite[]) => void;
  freqUrl: string;
  setFreqUrl: (freqUrl: string) => void;
  debugInfo: any | null;
  setDebugInfo: (debugInfo: any | null) => void;
  facetOpen: Record<string, boolean>;
  setFacetOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  facetPage: Record<string, number>;
  setFacetPage: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  facetItems: Record<string, any[]>;
  setFacetItems: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  facetTotalPages: Record<string, number>;
  setFacetTotalPages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  facetLoading: Record<string, boolean>;
  setFacetLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  facetAutoClose: boolean;
  setFacetAutoClose: React.Dispatch<React.SetStateAction<boolean>>;
  facetTemp: Record<string, Set<string>>;
  setFacetTemp: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  facetFilter: Record<string, string>;
  setFacetFilter: (facetFilter: Record<string, string>) => void;
  agenciesData: any[];
  setAgenciesData: (agenciesData: any[]) => void;
  agenciesLoading: boolean;
  setAgenciesLoading: (agenciesLoading: boolean) => void;
  suggested: any | null;
  setSuggested: (suggested: any | null) => void;
  suggestedLoading: boolean;
  setSuggestedLoading: (suggestedLoading: boolean) => void;
  agenciesPanelOpen: boolean;
  setAgenciesPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  suggestedPanelOpen: boolean;
  setSuggestedPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  expandedDoc: string | null;
  setExpandedDoc: (expandedDoc: string | null) => void;
  expandedLoading: boolean;
  setExpandedLoading: (expandedLoading: boolean) => void;
  expandedError: string | null;
  setExpandedError: (expandedError: string | null) => void;
  expandedRaw: any | null;
  setExpandedRaw: (expandedRaw: any | null) => void;
  expandedDetail: NormalizedFRDoc | null;
  setExpandedDetail: React.Dispatch<React.SetStateAction<NormalizedFRDoc | null>>;
  searchDetailsDoc: any | null;
  setSearchDetailsDoc: (doc: any | null) => void;
}

const FederalRegisterContext = createContext<FederalRegisterState | undefined>(undefined);

export const FederalRegisterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [term, setTerm] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [order, setOrder] = useState<string>("recent");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [useAggregated, setUseAggregated] = useState<boolean>(true);
  const [selectedFacets, setSelectedFacets] = useState<string[]>(["agency", "type", "section", "topic"]);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [baseUri, setBaseUri] = useState<string>('https://www.federalregister.gov/api/v1');
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [condAgencies, setCondAgencies] = useState<string>("");
  const [condTypes, setCondTypes] = useState<string>("");
  const [condSections, setCondSections] = useState<string>("");
  const [condTopics, setCondTopics] = useState<string>("");
  const [condAgencyQuery, setCondAgencyQuery] = useState<string>("");
  const [condAgencySuggests, setCondAgencySuggests] = useState<any[]>([]);
  const [condAgencySuggestOpen, setCondAgencySuggestOpen] = useState<boolean>(false);
  const [condSectionQuery, setCondSectionQuery] = useState<string>("");
  const [condSectionSuggests, setCondSectionSuggests] = useState<any[]>([]);
  const [condSectionSuggestOpen, setCondSectionSuggestOpen] = useState<boolean>(false);
  const [condSectionSource, setCondSectionSource] = useState<Array<{slug:string;name:string}>>([]);
  const [condSectionLoaded, setCondSectionLoaded] = useState<boolean>(false);
  const [condTopicQuery, setCondTopicQuery] = useState<string>("");
  const [condTopicSuggests, setCondTopicSuggests] = useState<any[]>([]);
  const [condTopicSuggestOpen, setCondTopicSuggestOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState<string>("");
  const [payload, setPayload] = useState<any | null>(null);
  const [results, setResults] = useState<DocLite[]>([]);
  const [freqUrl, setFreqUrl] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const [facetOpen, setFacetOpen] = useState<Record<string, boolean>>({});
  const [facetPage, setFacetPage] = useState<Record<string, number>>({});
  const [facetItems, setFacetItems] = useState<Record<string, any[]>>({});
  const [facetTotalPages, setFacetTotalPages] = useState<Record<string, number>>({});
  const [facetLoading, setFacetLoading] = useState<Record<string, boolean>>({});
  const [facetAutoClose, setFacetAutoClose] = useState<boolean>(true);
  const [facetTemp, setFacetTemp] = useState<Record<string, Set<string>>>({});
  const [facetFilter, setFacetFilter] = useState<Record<string, string>>({});
  const [agenciesData, setAgenciesData] = useState<any[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState<boolean>(false);
  const [suggested, setSuggested] = useState<any | null>(null);
  const [suggestedLoading, setSuggestedLoading] = useState<boolean>(false);
  const [agenciesPanelOpen, setAgenciesPanelOpen] = useState<boolean>(false);
  const [suggestedPanelOpen, setSuggestedPanelOpen] = useState<boolean>(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedLoading, setExpandedLoading] = useState<boolean>(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [expandedRaw, setExpandedRaw] = useState<any | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<NormalizedFRDoc | null>(null);
  const [searchDetailsDoc, setSearchDetailsDoc] = useState<any | null>(null);

  const value = useMemo(
    () => ({
      term,
      setTerm,
      perPage,
      setPerPage,
      order,
      setOrder,
      page,
      setPage,
      totalPages,
      setTotalPages,
      useAggregated,
      setUseAggregated,
      selectedFacets,
      setSelectedFacets,
      debugMode,
      setDebugMode,
      baseUri,
      setBaseUri,
      dateStart,
      setDateStart,
      dateEnd,
      setDateEnd,
      condAgencies,
      setCondAgencies,
      condTypes,
      setCondTypes,
      condSections,
      setCondSections,
      condTopics,
      setCondTopics,
      condAgencyQuery,
      setCondAgencyQuery,
      condAgencySuggests,
      setCondAgencySuggests,
      condAgencySuggestOpen,
      setCondAgencySuggestOpen,
      condSectionQuery,
      setCondSectionQuery,
      condSectionSuggests,
      setCondSectionSuggests,
      condSectionSuggestOpen,
      setCondSectionSuggestOpen,
      condSectionSource,
      setCondSectionSource,
      condSectionLoaded,
      setCondSectionLoaded,
      condTopicQuery,
      setCondTopicQuery,
      condTopicSuggests,
      setCondTopicSuggests,
      condTopicSuggestOpen,
      setCondTopicSuggestOpen,
      loading,
      setLoading,
      error,
      setError,
      searchUrl,
      setSearchUrl,
      payload,
      setPayload,
      results,
      setResults,
      freqUrl,
      setFreqUrl,
      debugInfo,
      setDebugInfo,
      facetOpen,
      setFacetOpen,
      facetPage,
      setFacetPage,
      facetItems,
      setFacetItems,
      facetTotalPages,
      setFacetTotalPages,
      facetLoading,
      setFacetLoading,
      facetAutoClose,
      setFacetAutoClose,
      facetTemp,
      setFacetTemp,
      facetFilter,
      setFacetFilter,
      agenciesData,
      setAgenciesData,
      agenciesLoading,
      setAgenciesLoading,
      suggested,
      setSuggested,
      suggestedLoading,
      setSuggestedLoading,
      agenciesPanelOpen,
      setAgenciesPanelOpen,
      suggestedPanelOpen,
      setSuggestedPanelOpen,
      expandedDoc,
      setExpandedDoc,
      expandedLoading,
      setExpandedLoading,
      expandedError,
      setExpandedError,
      expandedRaw,
      setExpandedRaw,
      expandedDetail,
      setExpandedDetail,
      searchDetailsDoc,
      setSearchDetailsDoc,
    }),
    [
      term,
      perPage,
      order,
      page,
      totalPages,
      useAggregated,
      selectedFacets,
      debugMode,
      baseUri,
      dateStart,
      dateEnd,
      condAgencies,
      condTypes,
      condSections,
      condTopics,
      condAgencyQuery,
      condAgencySuggests,
      condAgencySuggestOpen,
      condSectionQuery,
      condSectionSuggests,
      condSectionSuggestOpen,
      condSectionSource,
      condSectionLoaded,
      condTopicQuery,
      condTopicSuggests,
      condTopicSuggestOpen,
      loading,
      error,
      searchUrl,
      payload,
      results,
      freqUrl,
      debugInfo,
      facetOpen,
      facetPage,
      facetItems,
      facetTotalPages,
      facetLoading,
      facetAutoClose,
      facetTemp,
      facetFilter,
      agenciesData,
      agenciesLoading,
      suggested,
      suggestedLoading,
      agenciesPanelOpen,
      suggestedPanelOpen,
      expandedDoc,
      expandedLoading,
      expandedError,
      expandedRaw,
      expandedDetail,
      searchDetailsDoc,
    ]
  );

  return <FederalRegisterContext.Provider value={value}>{children}</FederalRegisterContext.Provider>;
};

export const useFederalRegister = (): FederalRegisterState => {
  const context = useContext(FederalRegisterContext);
  if (context === undefined) {
    throw new Error('useFederalRegister must be used within a FederalRegisterProvider');
  }
  return context;
};
