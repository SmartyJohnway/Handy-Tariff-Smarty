import React, { useEffect } from "react";
import { useQueryClient } from '@tanstack/react-query';

import { Label } from "../components/ui/label";
import { Input } from "../components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Button } from "../components/ui/Button";
import { CollapsibleJson } from "../components/ui/CollapsibleJson";
import { Switch } from "../components/ui/switch";
import { FacetsGrid } from "../components/fr/FacetsGrid";
import { ResultsList } from "../components/fr/ResultsList";
import { SearchBar } from "../components/fr/SearchBar";
import { BasicControls } from "../components/fr/BasicControls";
import { DebugPanel } from "../components/fr/DebugPanel";
import { useSearch } from "../context/SearchContext";
import { Card } from "../components/ui/Card";
import { useFederalRegister } from "../context/FederalRegisterContext";
import { Badge } from "../components/ui/Badge";
import { SuggestedSearchesPanel } from "../components/fr/SuggestedSearchesPanel";
import { AgenciesAllPanel } from "../components/fr/AgenciesAllPanel";
import { StandalonePanelContainer } from "../components/fr/StandalonePanelContainer";

import {
  getSearchDetails,
} from "../lib/frTsApi2";
import { normalizeFind } from '@/lib/frNormalize';
//import { Frequency as DocumentFrequencyFacet } from "./fr-ts-microservices/src/facets/document/frequency";
import {
  useFederalRegisterSearchQuery,
  FederalRegisterSearchArgs,
} from '@/hooks/queries/useFederalRegisterSearchQuery';
import { useFrAgenciesAllQuery } from '@/hooks/queries/useFrAgenciesAllQuery';
import { DEFAULT_FR_SECTIONS, useFrSectionsQuery } from '@/hooks/queries/useFrSectionsQuery';
import { useFrSuggestedSearchesQuery } from '@/hooks/queries/useFrSuggestedSearchesQuery';
import { useFrFacetQuery } from '@/hooks/queries/useFrFacetQuery';
import { useFrSuggestedSearchFindQuery } from '@/hooks/queries/useFrSuggestedSearchFindQuery';
import { fetchFrAdapterFind } from '@/hooks/queries/useFrAdapterFindQuery';
import { useTranslation } from 'react-i18next';

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

export default function FederalRegister() {
  const { t } = useTranslation();
  const { setActiveTab } = useSearch() as any;

  const {
    term, setTerm, perPage, setPerPage, order, setOrder, page, setPage, totalPages, setTotalPages,
    useAggregated, setUseAggregated, selectedFacets, setSelectedFacets, debugMode, setDebugMode,
    baseUri, setBaseUri, dateStart, setDateStart, dateEnd, setDateEnd, condAgencies, setCondAgencies,
    condTypes, setCondTypes, condSections, setCondSections, condTopics, setCondTopics,
    condSectionSource, setCondSectionSource, condSectionLoaded, setCondSectionLoaded,
    loading, setLoading, error, setError,
    searchUrl, setSearchUrl, payload, setPayload, results, setResults, freqUrl, setFreqUrl,
    debugInfo, setDebugInfo, facetOpen, setFacetOpen, facetPage, setFacetPage, facetItems, setFacetItems,
    facetTotalPages, setFacetTotalPages, facetLoading, setFacetLoading, facetAutoClose, setFacetAutoClose,
    facetTemp, setFacetTemp, facetFilter, setFacetFilter, agenciesData, setAgenciesData,
    agenciesLoading, setAgenciesLoading, suggested, setSuggested, suggestedLoading, setSuggestedLoading,
    agenciesPanelOpen, setAgenciesPanelOpen, suggestedPanelOpen, setSuggestedPanelOpen,
    expandedDoc, setExpandedDoc, expandedLoading, setExpandedLoading, expandedError, setExpandedError,
    expandedRaw, setExpandedRaw, expandedDetail, setExpandedDetail, searchDetailsDoc, setSearchDetailsDoc
  } = useFederalRegister();
  const [searchArgs, setSearchArgs] = React.useState<FederalRegisterSearchArgs | null>(null);
  const frSearchQuery = useFederalRegisterSearchQuery(searchArgs, Boolean(searchArgs));
  const agenciesAllQuery = useFrAgenciesAllQuery({ debugMode, baseUri });
  const sectionsQuery = useFrSectionsQuery({ debugMode, baseUri });
  const fetchFacetPage = useFrFacetQuery();
  const queryClient = useQueryClient();
  // Suggestions no longer used (ConditionsPanel removed)
  const suggestedSearchesQuery = useFrSuggestedSearchesQuery({
    debugMode,
    baseUri,
    enabled: false,
  });
  const [condTypeOptions, setCondTypeOptions] = React.useState<any[]>([]);
  const [condTypeLoading, setCondTypeLoading] = React.useState<boolean>(false);
  const [agencyFacetItems, setAgencyFacetItems] = React.useState<any[]>([]);
  const [agencyFacetPage, setAgencyFacetPage] = React.useState<number>(1);
  const [agencyFacetTotalPages, setAgencyFacetTotalPages] = React.useState<number>(1);
  const [agencyFacetLoading, setAgencyFacetLoading] = React.useState<boolean>(false);
  const [topicFacetItems, setTopicFacetItems] = React.useState<any[]>([]);
  const [topicFacetPage, setTopicFacetPage] = React.useState<number>(1);
  const [topicFacetTotalPages, setTopicFacetTotalPages] = React.useState<number>(1);
  const [topicFacetLoading, setTopicFacetLoading] = React.useState<boolean>(false);
  const ALL_FACETS = React.useMemo(() => ["agency", "type", "section", "topic", "daily", "weekly", "monthly", "quarterly"], []);

const DEFAULT_BASE_URI = 'https://www.federalregister.gov/api/v1';
const [pendingSuggested, setPendingSuggested] = React.useState<{ slug: string; template: any } | null>(null);
  const suggestedFindQuery = useFrSuggestedSearchFindQuery({
    slug: pendingSuggested?.slug ?? '',
    debugMode,
    baseUri,
    enabled: Boolean(pendingSuggested?.slug),
  });
  const initialSearchDone = React.useRef(false);

  // Ensure aggregated mode and all facets selected by default (no UI toggle)
  React.useEffect(() => {
    setUseAggregated(true);
    setSelectedFacets(ALL_FACETS);
    // 強制關閉 debug 並重置 base URI，避免前端曝光除錯模式
    setDebugMode(false);
    setBaseUri(DEFAULT_BASE_URI);
  }, [setUseAggregated, setSelectedFacets, ALL_FACETS, setDebugMode, setBaseUri, DEFAULT_BASE_URI]);

  const idToSlugMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    try {
      (agenciesData || []).forEach((a: any) => {
        const it = a?.attributes ?? a;
        if (it?.id && it?.slug) map[Number(it.id)] = String(it.slug);
      });
    } catch {}
    return map;
  }, [agenciesData]);

  const buildConditions = React.useCallback(() => {
    const conditions: Record<string, any> = {};
    if (dateStart || dateEnd) {
      conditions.publication_date = {
        ...(dateStart ? { gte: dateStart } : {}),
        ...(dateEnd ? { lte: dateEnd } : {}),
      };
    }
    const toArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    if (condAgencies.trim()) conditions.agencies = toArr(condAgencies);
    if (condTypes.trim()) conditions.type = toArr(condTypes);
    if (condSections.trim()) conditions.sections = toArr(condSections);
    if (condTopics.trim()) conditions.topics = toArr(condTopics);
    return conditions;    
  }, [dateStart, dateEnd, condAgencies, condTypes, condSections, condTopics ]);

  const currentFacetConditions = React.useCallback(() => {
    const cnd = buildConditions();
    if (term.trim()) cnd.term = term.trim();
    return cnd;
  }, [buildConditions, term]);

  const triggerSearch = React.useCallback((pageOverride?: number) => {
    const conditions = buildConditions();
    const facets = useAggregated ? selectedFacets.filter(Boolean) : [];
    initialSearchDone.current = true;
    setLoading(true);
    setError(null);
    setResults([]);
    setPayload(null);
    setDebugInfo(null);
    setSearchArgs({
      term: term.trim(),
      perPage,
      page: typeof pageOverride === 'number' ? pageOverride : page,
      order,
      facets,
      conditions,
      debugMode,
      baseUri,
    });
  }, [
    term,
    perPage,
    order,
    page,
    useAggregated,
    selectedFacets,
    buildConditions,
    debugMode,
    baseUri,
    setLoading,
    setError,
    setResults,
    setPayload,
    setDebugInfo,
  ]);

  // Use a ref to keep scheduleSearch stable and avoid triggering the condition effect on page change
  const triggerSearchRef = React.useRef(triggerSearch);
  React.useEffect(() => {
    triggerSearchRef.current = triggerSearch;
  }, [triggerSearch]);

  // Debounce helper for auto actions（非輸入框變動）
  const searchDebounceRef = React.useRef<number | undefined>(undefined);
  const scheduleSearch = React.useCallback((delay = 300) => {
    try {
      if (searchDebounceRef.current !== undefined) window.clearTimeout(searchDebounceRef.current);
    } catch {}
    // @ts-ignore
    searchDebounceRef.current = window.setTimeout(() => { triggerSearchRef.current(); }, delay);
  }, []);
  React.useEffect(() => () => {
    try { if (searchDebounceRef.current !== undefined) window.clearTimeout(searchDebounceRef.current); } catch {}
  }, []);

  useEffect(() => {
    if (!frSearchQuery.data) return;
    setPayload(frSearchQuery.data.payload);
    setResults(frSearchQuery.data.docs as DocLite[]);
    setTotalPages(frSearchQuery.data.totalPages);
    setSearchUrl(frSearchQuery.data.url);
    if (debugMode) {
      setDebugInfo(frSearchQuery.data.debugInfo);
    } else {
      setDebugInfo(null);
    }
    setError(null);
    setLoading(false);
  }, [
    frSearchQuery.data,
    setPayload,
    setResults,
    setTotalPages,
    setSearchUrl,
    setDebugInfo,
    setError,
    setLoading,
    debugMode,
  ]);

  useEffect(() => {
    if (!frSearchQuery.error) return;
    const message =
      frSearchQuery.error instanceof Error
        ? frSearchQuery.error.message
        : String(frSearchQuery.error);
    setError(message);
    setLoading(false);
  }, [frSearchQuery.error, setError, setLoading]);

  useEffect(() => {
    const loadingState = Boolean(searchArgs) && frSearchQuery.isFetching;
    setLoading(loadingState);
  }, [searchArgs, frSearchQuery.isFetching, setLoading]);

  const applySuggestedTemplateData = React.useCallback((template: any) => {
    const tpl = template?.attributes ?? template ?? {};
    setTerm('');
    setDateStart('');
    setDateEnd('');
    setCondAgencies('');
    setCondTypes('');
    setCondSections('');
    setCondTopics('');
    const sc = (tpl?.search_conditions ?? {}) as any;
    const finalConditions: Record<string, any> = { ...(sc || {}) };
    try {
      if (
        !finalConditions.agencies &&
        Array.isArray(finalConditions.agency_ids) &&
        finalConditions.agency_ids.length
      ) {
        const slugs = finalConditions.agency_ids
          .map((id: any) => idToSlugMap[Number(id)])
          .filter((s: any) => typeof s === 'string' && s.length > 0);
        if (slugs.length > 0) {
          finalConditions.agencies = slugs;
        }
      }
    } catch {}
    if (finalConditions.term) setTerm(String(finalConditions.term));
    if (Array.isArray(finalConditions.agencies)) setCondAgencies(finalConditions.agencies.join(', '));
    if (Array.isArray(finalConditions.type)) setCondTypes(finalConditions.type.join(', '));
    if (Array.isArray(finalConditions.sections)) setCondSections(finalConditions.sections.join(', '));
    if (Array.isArray(finalConditions.topics)) setCondTopics(finalConditions.topics.join(', '));
    setPage(1);
    scheduleSearch(0);
  }, [idToSlugMap, scheduleSearch, setCondAgencies, setCondSections, setCondTopics, setCondTypes, setDateEnd, setDateStart, setPage, setTerm]);

  const handleApplySuggested = React.useCallback((tpl: any, slug?: string) => {
    const payload = tpl?.attributes ?? tpl;
    const slugValue = String(slug || payload?.slug || '').trim();
    if (slugValue) {
      setPendingSuggested({ slug: slugValue, template: payload });
      return;
    }
    applySuggestedTemplateData(payload);
  }, [applySuggestedTemplateData]);

  React.useEffect(() => {
    if (!pendingSuggested) return;
    if (suggestedFindQuery.isError) {
      console.error('Failed to fetch suggested search details', suggestedFindQuery.error);
      applySuggestedTemplateData(pendingSuggested.template);
      setPendingSuggested(null);
      return;
    }
    if (!suggestedFindQuery.isSuccess) return;
    const payload = suggestedFindQuery.data?.attributes ?? suggestedFindQuery.data;
    applySuggestedTemplateData(payload ?? pendingSuggested.template);
    setPendingSuggested(null);
  }, [pendingSuggested, suggestedFindQuery.isError, suggestedFindQuery.isSuccess, suggestedFindQuery.data, suggestedFindQuery.error, applySuggestedTemplateData]);

  React.useEffect(() => {
    setAgenciesLoading(agenciesAllQuery.isFetching);
  }, [agenciesAllQuery.isFetching, setAgenciesLoading]);

  React.useEffect(() => {
    if (Array.isArray(agenciesAllQuery.data)) {
      setAgenciesData(agenciesAllQuery.data);
    }
  }, [agenciesAllQuery.data, setAgenciesData]);

  React.useEffect(() => {
    if (sectionsQuery.isFetching) {
      setCondSectionLoaded(false);
    }
  }, [sectionsQuery.isFetching, setCondSectionLoaded]);

  React.useEffect(() => {
    if (!sectionsQuery.isSuccess) return;
    const list =
      sectionsQuery.data && sectionsQuery.data.length
        ? sectionsQuery.data
        : DEFAULT_FR_SECTIONS;
    setCondSectionSource(list);
    setCondSectionLoaded(true);
  }, [sectionsQuery.isSuccess, sectionsQuery.data, setCondSectionSource, setCondSectionLoaded]);

  React.useEffect(() => {
    if (!sectionsQuery.isError) return;
    setCondSectionSource(DEFAULT_FR_SECTIONS);
    setCondSectionLoaded(true);
  }, [sectionsQuery.isError, setCondSectionSource, setCondSectionLoaded]);

  React.useEffect(() => {
    setSuggestedLoading(suggestedSearchesQuery.isFetching);
  }, [suggestedSearchesQuery.isFetching, setSuggestedLoading]);

  React.useEffect(() => {
    if (suggestedSearchesQuery.isSuccess) {
      setSuggested(suggestedSearchesQuery.data);
    }
  }, [suggestedSearchesQuery.isSuccess, suggestedSearchesQuery.data, setSuggested]);

  // Reset loading when user edits the term to keep search manual
  React.useEffect(() => {
    setLoading(false);
  }, [term, setLoading]);

  // Auto-search when conditions (非 term) 變動
  React.useEffect(() => {
    setPage(1);
    scheduleSearch(300);
  }, [condAgencies, condTypes, condSections, condTopics, dateStart, dateEnd, scheduleSearch, setPage]);

  React.useEffect(() => {
    if (suggestedSearchesQuery.isError) {
      setSuggested(null);
    }
  }, [suggestedSearchesQuery.isError, setSuggested]);

  const { refetch: refetchAgencies } = agenciesAllQuery;
  const { refetch: refetchSuggestedSearches } = suggestedSearchesQuery;
  const totalCount = React.useMemo(() => {
    const p = payload as any;
    if (typeof p?.count === 'number') return p.count;
    if (typeof p?.total === 'number') return p.total;
    if (typeof p?.documents?.count === 'number') return p.documents.count;
    return Array.isArray(results) ? results.length : 0;
  }, [payload, results]);

  // --- Standalone Panels Auto-loading ---
  const loadAgencies = React.useCallback(() => {
    refetchAgencies();
  }, [refetchAgencies]);

  const loadSuggestedSearches = React.useCallback(() => {
    refetchSuggestedSearches();
  }, [refetchSuggestedSearches]);

  // Auto-load standalone panels on mount
  React.useEffect(() => {
    loadSuggestedSearches();
  }, [loadSuggestedSearches]);

  // Load topics facet (on demand for full list)
  const loadTopicFacetPage = React.useCallback(async (pageNum: number) => {
    setTopicFacetLoading(true);
    try {
      const conditions = currentFacetConditions();
      const res = await fetchFacetPage({
        facet: 'topic',
        page: pageNum,
        conditions,
        term: conditions.term,
        debugMode,
        baseUri,
      });
      setTopicFacetItems(res.items || []);
      setTopicFacetTotalPages(res.totalPages || 1);
      setTopicFacetPage(pageNum);
    } catch (err) {
      console.error('load topic facets failed', err);
      setTopicFacetItems([]);
      setTopicFacetTotalPages(1);
    } finally {
      setTopicFacetLoading(false);
    }
  }, [fetchFacetPage, debugMode, baseUri]);

  // Load agency facet options (full list)
  const loadAgencyFacetPage = React.useCallback(async (pageNum: number) => {
    setAgencyFacetLoading(true);
    try {
      const conditions = currentFacetConditions();
      const res = await fetchFacetPage({
        facet: 'agency',
        page: pageNum,
        conditions,
        term: conditions.term,
        debugMode,
        baseUri,
      });
      setAgencyFacetItems(res.items || []);
      setAgencyFacetTotalPages(res.totalPages || 1);
      setAgencyFacetPage(pageNum);
    } catch (err) {
      console.error('load agency facets failed', err);
      setAgencyFacetItems([]);
      setAgencyFacetTotalPages(1);
    } finally {
      setAgencyFacetLoading(false);
    }
  }, [fetchFacetPage, debugMode, baseUri]);

  // Load type facet options for conditions dropdown
  React.useEffect(() => {
  const loadTypes = async () => {
    setCondTypeLoading(true);
    try {
      const conditions = currentFacetConditions();
      const res = await fetchFacetPage({
        facet: 'type',
        page: 1,
        conditions,
        term: conditions.term,
        debugMode,
        baseUri,
      });
        setCondTypeOptions(res.items || []);
      } catch (err) {
        console.error('load type facets failed', err);
        setCondTypeOptions([]);
      } finally {
        setCondTypeLoading(false);
      }
    };
    loadTypes();
  }, [fetchFacetPage, debugMode, baseUri]);

  // Fetch agencies suggestions (Conditions)
  // Load facet page via backend facet endpoint
  const loadFacetPage = React.useCallback(async (facet: string, pageNum: number) => {
    const cnd: Record<string, any> = buildConditions();
    if (term.trim()) cnd.term = term.trim();
    setFacetLoading((s: Record<string, boolean>) => ({ ...s, [facet]: true }));
    try {
      const result = await fetchFacetPage({
        facet,
        page: pageNum,
        conditions: cnd,
        term: term.trim() || undefined,
        debugMode,
        baseUri,
      });
      setFacetItems((m: Record<string, any[]>) => ({ ...m, [facet]: result.items }));
      setFacetTotalPages((m: Record<string, number>) => ({ ...m, [facet]: result.totalPages || 1 }));
      setFacetPage((m: Record<string, number>) => ({ ...m, [facet]: pageNum }));
    } catch (err) {
      console.error(err);
      setFacetItems((m: Record<string, any[]>) => ({ ...m, [facet]: [] }));
    } finally {
      setFacetLoading((s: Record<string, boolean>) => ({ ...s, [facet]: false }));
    }
  }, [buildConditions, term, fetchFacetPage, debugMode, baseUri, setFacetLoading, setFacetItems, setFacetTotalPages, setFacetPage]);

  const groupByYear = (items: any[]) => {
    const map: Record<string, any[]> = {};
    for (const it of (items || [])) {
      const name = String(it?.name || '');
      const m = name.match(/(19|20)\d{2}/);
      const y = m ? m[0] : 'Other';
      if (!map[y]) map[y] = [];
      map[y].push(it);
    }
    const years = Object.keys(map).sort((a,b)=> (b==='Other'? -1 : a==='Other'? 1 : Number(b)-Number(a)));
    return years.map((y) => ({ year: y, items: map[y] }));
  };

  // Date helpers (port from P2)
  const toYMD = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const parseAnyDateToYMD = (s: string): string | null => {
    if (!s) return null;
    if (isYMD(s)) return s;
    const d = new Date(s);
    if (!isNaN(d.valueOf())) return toYMD(d);
    const s2 = s.replace(/\//g, '-');
    const d2 = new Date(s2);
    if (!isNaN(d2.valueOf())) return toYMD(d2);
    return null;
  };
  const parseQuarterSlug = (s: string): { start: string; end: string } | null => {
    let m = s.match(/^(\d{4})-Q([1-4])$/i);
    if (!m) {
      const alt = s.match(/^Q([1-4])\s+(\d{4})$/i);
      if (alt) m = [alt[0], alt[2], alt[1]] as any;
    }
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const q = parseInt(m[2], 10);
    const ranges: any = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };
    return ranges[q] || null;
  };
  const getISOWeekStart = (year: number, week: number): Date => {
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dow = simple.getUTCDay() || 7;
    if (dow > 1) simple.setUTCDate(simple.getUTCDate() - (dow - 1));
    return simple;
  };
  const parseWeekSlug = (s: string): { start: string; end: string } | null => {
    let m = s.match(/^(\d{4})-W?(\d{1,2})$/i);
    if (!m) m = s.match(/^(\d{4})\s*week\s*(\d{1,2})$/i);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    if (week < 1 || week > 53) return null;
    const start = getISOWeekStart(year, week);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: toYMD(start), end: toYMD(end) };
  };

  // Header badge: selected count per facet
  const getFacetSelectedCount = (fname: string) => {
    const csvCount = (s: string) => s.split(',').map((x)=>x.trim()).filter(Boolean).length;
    if (fname === 'agency') return csvCount(condAgencies);
    if (fname === 'topic') return csvCount(condTopics);
    if (fname === 'section') return csvCount(condSections);
    if (fname === 'type') return csvCount(condTypes);
    if (fname === 'daily' || fname === 'weekly' || fname === 'monthly' || fname === 'quarterly' || fname === 'yearly') return (dateStart && dateEnd) ? 1 : 0;
    return 0;
  };

  const parseMonthSlug = (s: string): { start: string; end: string } | null => {
    let m = s.match(/^(\d{4})[-\s]?(\d{1,2})$/);
    let year: number | null = null;
    let mon: number | null = null;
    if (m) {
      year = parseInt(m[1], 10);
      mon = Math.max(1, Math.min(12, parseInt(m[2], 10)));
    } else {
      const MONTHS: Record<string, number> = {
        jan:1, january:1, feb:2, february:2, mar:3, march:3, apr:4, april:4, may:5,
        jun:6, june:6, jul:7, july:7, aug:8, august:8, sep:9, sept:9, september:9,
        oct:10, october:10, nov:11, november:11, dec:12, december:12,
      };
      const t = s.trim().toLowerCase();
      // Patterns: "January 2025" or "2025 January"
      let mm = t.match(/^([a-z]+)\s+(\d{4})$/);
      if (mm && MONTHS[mm[1]]) { mon = MONTHS[mm[1]]; year = parseInt(mm[2], 10); }
      if (year === null || mon === null) {
        mm = t.match(/^(\d{4})\s+([a-z]+)$/);
        if (mm && MONTHS[mm[2]]) { year = parseInt(mm[1], 10); mon = MONTHS[mm[2]]; }
      }
      if (year === null || mon === null) return null;
    }
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 0)); // day 0 of next month = last day of month
    return { start: toYMD(start), end: toYMD(end) };
  };

  const parseYearSlug = (s: string): { start: string; end: string } | null => {
    const m = s.match(/^(19|20)\d{2}$/);
    if (!m) return null;
    const year = parseInt(s, 10);
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    return { start: toYMD(start), end: toYMD(end) };
  };

  // Load single document details
  const loadDetail = async (docnum: string) => {
    setExpandedDoc(docnum);
    setExpandedRaw(null);
    setExpandedDetail(null);
    setExpandedError(null);
    setExpandedLoading(true);
    try {
      const { payload } = await queryClient.fetchQuery({
        queryKey: ['fr-adapter-find', docnum],
        queryFn: () => fetchFrAdapterFind(docnum, debugMode ? baseUri : undefined),
      });
      const docPayload = payload?.document || payload;
      setExpandedDetail(normalizeFind(payload));
      setExpandedRaw(docPayload);
    } catch (e: any) {
      setExpandedError(e?.message || 'Load detail failed');
    } finally {
      setExpandedLoading(false);
    }
  };

  const fetchSearchDetails = React.useCallback(async () => {
    try {
      const r = await getSearchDetails({ for: 'documents', term: term.trim() || undefined, conditions: buildConditions(), base_uri: debugMode ? baseUri : undefined }); // baseUri from context
      if ((r as any)?.status === 200) setSearchDetailsDoc(r.payload);
    } catch {
      // ignore
    }
  }, [term, buildConditions, debugMode, baseUri]);

  // Immediate facet selection (toggle chips + re-search)
  const toggleImmediate = (key: string, slug: string, name: string) => {
    const removeFromCsv = (csv: string, val: string) => csv.split(",").map((s) => s.trim()).filter(Boolean).filter((x) => x !== val).join(",");
    const addToCsv = (csv: string, val: string) => {
      const list = csv.split(",").map((s) => s.trim()).filter(Boolean);
      if (!list.includes(val)) list.push(val);
      return list.join(",");
    };
    if (key === "agency") {
      const has = condAgencies.split(",").map((s) => s.trim()).filter(Boolean).includes(slug);
      setCondAgencies(has ? removeFromCsv(condAgencies, slug) : addToCsv(condAgencies, slug));
    } else if (key === "topic") {
      const has = condTopics.split(",").map((s) => s.trim()).filter(Boolean).includes(slug);
      setCondTopics(has ? removeFromCsv(condTopics, slug) : addToCsv(condTopics, slug));
    } else if (key === "section") {
      const has = condSections.split(",").map((s) => s.trim()).filter(Boolean).includes(slug);
      setCondSections(has ? removeFromCsv(condSections, slug) : addToCsv(condSections, slug));
    } else if (key === "type") {
      const code = (slug || name || '').toUpperCase();
      const has = condTypes.split(",").map((s) => s.trim()).filter(Boolean).includes(code);
      setCondTypes(has ? removeFromCsv(condTypes, code) : addToCsv(condTypes, code));
    } else if (key === "daily") {
      const d = parseAnyDateToYMD(slug) || parseAnyDateToYMD(name);
      if (d) {
        const newStart = dateStart ? (d < dateStart ? d : dateStart) : d;
        const newEnd = dateEnd ? (d > dateEnd ? d : dateEnd) : d;
        setDateStart(newStart);
        setDateEnd(newEnd);
      }
    } else if (key === "weekly") {
      const r = parseWeekSlug(slug) || parseWeekSlug(name);
      if (r) {
        const newStart = dateStart ? (r.start < dateStart ? r.start : dateStart) : r.start;
        const newEnd = dateEnd ? (r.end > dateEnd ? r.end : dateEnd) : r.end;
        setDateStart(newStart);
        setDateEnd(newEnd);
      }
    } else if (key === "monthly") {
      const r = parseMonthSlug(slug) || parseMonthSlug(name);
      if (r) {
        const newStart = dateStart ? (r.start < dateStart ? r.start : dateStart) : r.start;
        const newEnd = dateEnd ? (r.end > dateEnd ? r.end : dateEnd) : r.end;
        setDateStart(newStart);
        setDateEnd(newEnd);
      }
    } else if (key === "quarterly") {
      const r = parseQuarterSlug(slug) || parseQuarterSlug(name);
      if (r) {
        const newStart = dateStart ? (r.start < dateStart ? r.start : dateStart) : r.start;
        const newEnd = dateEnd ? (r.end > dateEnd ? r.end : dateEnd) : r.end;
        setDateStart(newStart);
        setDateEnd(newEnd);
      }
    } else if (key === "yearly") {
      const r = parseYearSlug(slug) || parseYearSlug(name);
      if (r) {
        const newStart = dateStart ? (r.start < dateStart ? r.start : dateStart) : r.start;
        const newEnd = dateEnd ? (r.end > dateEnd ? r.end : dateEnd) : r.end;
        setDateStart(newStart);
        setDateEnd(newEnd);
      }
    }
    setPage(1);
  };

  // Compute facets rows
  const facetsObj = (payload as any)?.facets || {};
  const rowKeys = useAggregated ? ["agency", "type", "section", "topic", "daily", "weekly", "monthly", "quarterly"] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('fr.title')}</h2>
    </div>



      <SearchBar term={term} onTermChange={setTerm} loading={loading} onSearch={triggerSearch} debugMode={debugMode} searchUrl={searchUrl} />

      {/* Basic Controls */}
      <Card className="p-4">
      <BasicControls
        dateStart={dateStart}
        dateEnd={dateEnd}
        perPage={perPage}
        order={order}
        onDateStartChange={setDateStart}
        onDateEndChange={setDateEnd}
        onPerPageChange={setPerPage}
        onOrderChange={setOrder}
        onClearDates={() => { setDateStart(""); setDateEnd(""); }}
      />
      </Card>
      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {condAgencies.split(",").map((s) => s.trim()).filter(Boolean).map((slug) => (
          <Badge key={`ag-${slug}`} variant="secondary" className="cursor-pointer" onClick={() => {
            setCondAgencies(condAgencies.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => x !== slug).join(",")); setPage(1);
          }} title="Remove agency">
            {t('fr.badgeAgency',{slug})}
          </Badge>
        ))}
        {condTypes.split(",").map((s) => s.trim()).filter(Boolean).map((typeVal) => (
          <Badge key={`type-${typeVal}`} variant="secondary" className="cursor-pointer" onClick={() => {
            setCondTypes(condTypes.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => x !== typeVal).join(",")); setPage(1);
          }} title="Remove type">
            {t('fr.badgeType',{value: typeVal})}
          </Badge>
        ))}
        {condSections.split(",").map((s) => s.trim()).filter(Boolean).map((slug) => (
          <Badge key={`sec-${slug}`} variant="secondary" className="cursor-pointer" onClick={() => {
            setCondSections(condSections.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => x !== slug).join(",")); setPage(1);
          }} title="Remove section">
            {t('fr.badgeSection',{slug})}
          </Badge>
        ))}
        {condTopics.split(",").map((s) => s.trim()).filter(Boolean).map((slug) => (
          <Badge key={`tp-${slug}`} variant="secondary" className="cursor-pointer" onClick={() => {
            setCondTopics(condTopics.split(",").map((x) => x.trim()).filter(Boolean).filter((x) => x !== slug).join(",")); setPage(1);
          }} title="Remove topic">
            {t('fr.badgeTopic',{slug})}
          </Badge>
        ))}
      </div>

      {/* Facets grid (from payload.facets) */}
      {useAggregated && (
        <Card className="p-3 md:p-4">
          <FacetsGrid
            rowKeys={rowKeys}
            facetsObj={(payload as any)?.facets || {}}
            getFacetSelectedCount={getFacetSelectedCount}
            onClear={(fname) => {
              if (fname==='agency') setCondAgencies('');
              else if (fname==='topic') setCondTopics('');
              else if (fname==='section') setCondSections('');
              else if (fname==='type') setCondTypes('');
              else if (fname==='daily' || fname==='weekly' || fname==='monthly' || fname==='quarterly' || fname==='yearly') { setDateStart(''); setDateEnd(''); }
              setPage(1);
            }}
            facetOpen={facetOpen}
            setFacetOpen={setFacetOpen}
            facetPage={facetPage}
            facetTotalPages={facetTotalPages}
            facetItems={facetItems}
            facetLoading={facetLoading}
            facetAutoClose={facetAutoClose}
            setFacetAutoClose={setFacetAutoClose}
            loadFacetPage={loadFacetPage}
            onSelectItem={(fname, nm, slug) => {
              if (fname==='quarterly' && (!slug) && /^(19|20)\d{2}$/.test(nm)) {
                toggleImmediate('yearly', nm, nm);
              } else {
                toggleImmediate(fname, slug || nm, nm);
              }
              // 即時套用：重置頁碼並觸發搜尋（facet counts 由下一次 payload.facets 回來再更新）
              setPage(1);
            }}
            groupByYear={groupByYear}
          />
        </Card>
      )}

      {/* Pagination & tools */}
      <div className="flex items-center gap-2 text-sm flex-wrap md:flex-nowrap gap-y-2">
        {debugMode && (
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="fr-base-uri" className="text-xs shrink-0">{t('fr.baseUri')}</Label>
            <Input id="fr-base-uri" value={baseUri} onChange={(e)=>{
              const val = e.target.value;
              if (val.trim() === '') setBaseUri(DEFAULT_BASE_URI); else setBaseUri(val);
            }} placeholder={DEFAULT_BASE_URI} className="h-9 text-sm" />
          </div>
        )}
      </div>

      {error && <div className="text-destructive text-sm">{error}</div>}
      {debugMode && (
        <Card className="p-3 md:p-4">
          <DebugPanel
            debugMode={debugMode}
            payload={payload}
            debugInfo={debugInfo}
            appliedConditions={{
              term: term.trim() || undefined,
              conditions: buildConditions(),
              per_page: perPage,
              page,
              order,
              facets: useAggregated ? selectedFacets : [],
            }}
          />
        </Card>
      )}
      {/* {t('fr.frequency')} chart */}
      {freqUrl && (
        <div className="border rounded p-2">
          <div className="font-semibold text-sm mb-1">{t('fr.frequencyChart')}</div>
          <div className="overflow-auto"><img src={freqUrl} alt="frequency chart" className="max-w-full" /></div>
          <div className="text-[11px] text-muted-foreground truncate mt-1" title={freqUrl}>{freqUrl}</div>
        </div>
      )}

      {/* Results list with expandable details */}
      <Card className="p-3 md:p-4" data-fr-results>
        <ResultsList
          results={results}
          expandedDoc={expandedDoc}
          expandedLoading={expandedLoading}
          expandedError={expandedError}
          expandedRaw={expandedRaw}
          expandedDetail={expandedDetail}
          onLoadDetail={loadDetail}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPrevPage={() => {
            const p = Math.max(1, page - 1);
            setPage(p);
            triggerSearch(p);
          }}
          onNextPage={() => {
            const p = page + 1;
            setPage(p);
            triggerSearch(p);
          }}
          paginationDisabled={loading}
          debugMode={debugMode}
          onLoadSearchDetails={fetchSearchDetails}
          searchDetails={searchDetailsDoc}
        />
      </Card>

      {/* Standalone Panels */}
      <Card className="p-3 md:p-4">
        <StandalonePanelContainer
          title={t('fr.agenciesTitle')}
          isOpen={agenciesPanelOpen}
          hasData={agenciesData.length > 0}
          loading={agenciesLoading}
          onLoad={loadAgencies}
          onToggle={() => setAgenciesPanelOpen((v: boolean) => !v)}
        >
          {agenciesData.length > 0 ? (
            <AgenciesAllPanel agencies={agenciesData} debugMode={debugMode} />
          ) : (
            <div className="text-sm text-muted-foreground">{t('fr.agenciesEmpty')}</div>
          )}
        </StandalonePanelContainer>
      </Card>

      <Card className="p-3 md:p-4">
        <StandalonePanelContainer
          title={t('fr.suggestedTitle')}
          isOpen={suggestedPanelOpen}
          hasData={!!suggested}
          loading={suggestedLoading}
          onLoad={loadSuggestedSearches}
          onToggle={() => setSuggestedPanelOpen((v: boolean) => !v)}
        >
          {suggested ? (
            <SuggestedSearchesPanel
              data={suggested}
              debugMode={debugMode}
              applyingSlug={pendingSuggested?.slug ?? null}
              onApply={handleApplySuggested}
            />
          ) : (
            <div className="text-sm text-muted-foreground">{t('fr.suggestedEmpty')}</div>
          )}
        </StandalonePanelContainer>
      </Card>
    </div>
  );
}
