import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Badge } from '../components/ui/Badge';
import { cleanHtsToSix, CountryOption } from '../utils/countries';
import { useMarketTrends } from '../context/MarketTrendsContext';
import CompareTableTanstack from '../components/ui/CompareTableTanstack';
import DataTableTanstack from '../components/ui/DataTableTanstack';
import { CountrySelector } from '../components/intelligence/CountrySelector';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertTriangle, Check } from 'lucide-react';
import { useAdvancedTrendsQuery } from '../hooks/queries/useAdvancedTrendsQuery';
import { useCountriesQuery } from '../hooks/queries/useCountriesQuery';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

type Flow = 'cons' | 'gen' | 'balance';

const METRICS: { key: string; label: string; flow: ('cons'|'gen'|'balance')[] }[] = [
  { key: 'quantity', label: 'Quantity', flow: ['cons','gen'] },
  { key: 'value', label: 'Customs Value / Balance', flow: ['cons','gen','balance'] },
  { key: 'cif', label: 'CIF Value', flow: ['cons','gen'] },
  { key: 'charges', label: 'Import Charges', flow: ['cons','gen'] },
  { key: 'calc_duties', label: 'Calculated Duties', flow: ['cons'] },
  { key: 'dutiable', label: 'Dutiable Value', flow: ['cons'] },
  { key: 'landed', label: 'Landed (CIF + Duties)', flow: ['cons'] },
];

const DEFAULT_LINE_COLORS = [
  '#1d4ed8', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#0ea5e9', '#f97316',
  '#0891b2', '#a855f7', '#22c55e', '#f43f5e', '#14b8a6', '#6366f1', '#ef4444',
  '#facc15', '#0f766e', '#ec4899', '#fb7185', '#4ade80', '#38bdf8',
];

const METRIC_STROKES: Record<string, string | undefined> = {
  quantity: undefined,
  value: '4 0',
  cif: '6 4',
  charges: '3 3',
  calc_duties: '2 6',
  dutiable: '10 4',
  landed: '1 4',
};

// 依主題 `--chart-*` 取色，確保符合 tailwind_theming_guide。
const chartSlotColor = (idx: number, fallbackPalette: string[] = DEFAULT_LINE_COLORS) => {
  const slot = ((idx % 10) + 1);
  // 使用主題 chart 色票 (rgb triplet)。若變數不存在，瀏覽器可退回 fallback。
  const cssColor = `rgb(var(--chart-${slot}))`;
  const fb = fallbackPalette[idx % fallbackPalette.length] || '#2563eb';
  return cssColor || fb;
};

type SeriesMeta = {
  key: string;
  hts: string;
  metric: string;
  label: string;
};

type SeriesWithStyle = SeriesMeta & { color: string; strokeDasharray?: string };

export default function MarketTrendsAdvanced() {
  const { t } = useTranslation();
  const {
    hts, setHts,
    countryCodes, setCountryCodes,
    period, setPeriod,
    flow, setFlow,
    metrics, setMetrics,
    breakout: breakoutState,
  } = useMarketTrends();

  const [granularity, setGranularity] = useState<'6'|'8'|'10'>('10');
  const { data: countries = [] } = useCountriesQuery();
  const [diagnostic, setDiagnostic] = useState<boolean>(false);
  // Compare (國家別差異)
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  // Compare Metrics (比較指標) 預設為 Quantity
  const [compareMetric, setCompareMetric] = useState<'quantity'|'value'|'cif'|'charges'|'calc_duties'|'dutiable'|'landed'>('quantity');
  const [compareYearA, setCompareYearA] = useState<string>('');
  const [compareYearB, setCompareYearB] = useState<string>('');
  const [compareMode, setCompareMode] = useState<'abs'|'pct'>('abs');
  const [compareTopN, setCompareTopN] = useState<number>(10);
  const [compareSort, setCompareSort] = useState<'desc'|'asc'|'abs'>('desc');
  const [processedOpen, setProcessedOpen] = useState(false);
  const [recoOpen, setRecoOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [chartColors, setChartColors] = useState<string[]>(DEFAULT_LINE_COLORS);
  const [breakoutTarget, setBreakoutTarget] = useState<'countries'|'commodities'>('commodities');
  const flowLabels = useMemo(() => ({
    cons: t('market.advanced.flowCons'),
    gen: t('market.advanced.flowGen'),
    balance: t('market.advanced.flowBalance'),
  }), [t]);
  const metricLabelMap = useMemo(
    () => (t('market.advanced.metricLabels', { returnObjects: true }) as Record<string, string>),
    [t]
  );
  const getMetricLabel = (key: string) =>
    metricLabelMap?.[key] || METRICS.find(m => m.key === key)?.label || key;

  // 依據 tailwind 主題讀取 chart 顏色，主題切換後陣列會更新
  useEffect(() => {
    try {
      const root = getComputedStyle(document.documentElement);
      const vars: string[] = [];
      for (let i = 1; i <= 12; i++) {
        const v = root.getPropertyValue(`--chart-${i}`).trim();
        if (v) vars.push(`oklch(${v})`);
      }
      if (vars.length) setChartColors(vars);
    } catch {
      // ignore, fallback to DEFAULT_LINE_COLORS
    }
  }, [/* runs on mount and theme changes (class/data-theme) */]);

  const normalizedHts = useMemo(() => {
    const cleaned = hts.map(code => cleanHtsToSix(code)).filter(Boolean);
    return Array.from(new Set(cleaned));
  }, [hts]);
  // Map metric keys to DataWeb dataToReport codes (for diagnostics summary)
  const resolveDataToReport = (flowKey: 'cons'|'gen'|'balance', metricKey: string): string => {
    if (flowKey === 'balance') return 'FAS_VALUE-GEN_CUSTOMS_VALUE';
    const map: Record<string, string> = {
        'cons:quantity': 'CONS_FIR_UNIT_QUANT',
        'cons:value': 'CONS_CUSTOMS_VALUE',
        'cons:cif': 'CONS_COST_INS_FREIGHT',
        'cons:charges': 'CONS_CHARGES_INS_FREIGHT',
        'cons:dutiable': 'CONS_CUSTOMS_VALUE_SUB_DUTY',
        'cons:calc_duties': 'CONS_CALC_DUTY',
        'gen:quantity': 'GEN_FIR_UNIT_QUANTITY',
        'gen:value': 'GEN_CUSTOMS_VALUE',
        'gen:cif': 'GEN_COST_INS_FREIGHT',
        'gen:charges': 'GEN_CHARGES_INS_FREIGHT',
        'gen:dutiable': 'GEN_DUTIABLE_VALUE',
        'gen:calc_duties': 'GEN_CALC_DUTY',
        };
        return map[flowKey + ':' + metricKey] || map['cons:quantity'];
      };


  // Flow Trades (貿易) Balance (餘額) Value (價值) Compare (比較) Value (價值)
  useEffect(() => {
    if (flow === 'balance') {
      if (metrics.length !== 1 || metrics[0] !== 'value') setMetrics(['value']);
      if (compareEnabled && compareMetric !== 'value') setCompareMetric('value');
    }
  }, [flow, compareEnabled, compareMetric, metrics, setMetrics]);

  const [chartNode, setChartNode] = useState<HTMLDivElement | null>(null);
  const chartCallbackRef = React.useCallback((node: HTMLDivElement | null) => {
    setChartNode(node);
  }, []);
  const [chartSize, setChartSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    if (!chartNode) return;
    const el = chartNode;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width || el.clientWidth || 0);
      const h = Math.floor(rect.height || el.clientHeight || 0);
      setChartSize({ w, h });
    };
    let cleanup: (() => void) | undefined;
    try {
      const RO = (window as any).ResizeObserver;
      if (RO) {
        const ro = new RO(() => measure());
        ro.observe(el);
        measure();
        cleanup = () => ro.disconnect();
      }
    } catch {}
    if (!cleanup) {
      const onResize = () => measure();
      window.addEventListener('resize', onResize);
      measure();
      let tries = 0;
      const id = window.setInterval(() => {
        tries++;
        const rect = el.getBoundingClientRect();
        if ((rect.width || el.clientWidth) > 0 && (rect.height || el.clientHeight) > 0) {
          measure();
          window.clearInterval(id);
        } else if (tries > 20) {
          window.clearInterval(id);
        }
      }, 100);
      cleanup = () => {
        window.removeEventListener('resize', onResize);
        window.clearInterval(id);
      };
    }
    return () => { cleanup?.(); };
  }, [chartNode]);
  const canRenderCharts = chartSize.w > 10 && chartSize.h > 10;
  const fallbackHeight = chartSize.h || 384;

  const handleHtsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalHtsInput(value); // Immediately update local state for smooth input
    if (htsDebounceRef.current) clearTimeout(htsDebounceRef.current);
    htsDebounceRef.current = setTimeout(() => {
      const htsArray = value.split(/[\s,]+/).filter(Boolean);
      setHts(htsArray);
    }, 300);
  };

  // Use a local state for the input to provide a smooth typing experience.
  // The global state (from context) is only updated via debounce.
  const [localHtsInput, setLocalHtsInput] = useState(() => hts.join(', '));
  const htsDebounceRef = useRef<any>(null);

  useEffect(() => {
    const htsFromInput = localHtsInput.split(/[\s,]+/).filter(Boolean);
    
    // A simple deep-enough comparison
    const areArraysEqual = hts.length === htsFromInput.length && hts.every((val, index) => val === htsFromInput[index]);

    if (!areArraysEqual) {
      setLocalHtsInput(hts.join(', '));
    }
  }, [hts]);

  
  const diagSummaryText = useMemo(() => {
    try {
      const url = buildUrl();
      const allowedKeys = METRICS.filter(m => m.flow.includes(flow)).map(m => m.key);
      const pickedKeys = metrics.filter(m => allowedKeys.includes(m));
      let metricList: string[] = [];
      if (flow === 'balance') metricList = ['value'];
      else if (compareEnabled) metricList = allowedKeys; else metricList = pickedKeys.length ? pickedKeys : ['quantity'];
      const codes = Array.from(new Set(metricList.map(m => resolveDataToReport(flow as any, m))));
      return JSON.stringify({ url, dataToReport: codes }, null, 2);
    } catch { return JSON.stringify({ url: '', dataToReport: [] }, null, 2); }
  }, [flow, metrics, compareEnabled, period.ytd, granularity, countryCodes, normalizedHts, compareMetric, compareMode, compareSort, compareTopN]);



  function buildUrl(): string {
    const params = new URLSearchParams();
    if (hts.length) {
      // Balance normalizedHts
      params.set('commodities', (flow === 'balance') ? normalizedHts.join(',') : hts.join(','));
    }
    params.set('flow', flow);
    params.set('history_years', String(period.years));

    params.set('ytd', String(period.ytd));
    const multiHtsBreakout = !compareEnabled && !breakoutState.enabled && hts.length > 1;
    if (breakoutState.enabled || compareEnabled || multiHtsBreakout) params.set('breakout', 'true');
    if ((breakoutState.enabled || multiHtsBreakout) && breakoutTarget === 'commodities') params.set('commodities_breakout', 'true');
    const allowed = METRICS.filter(m => m.flow.includes(flow)).map(m => m.key);
    const picked = metrics.filter(m => allowed.includes(m));
    if (compareEnabled) {
      if (flow === 'balance') {
        params.set('metric', 'value');
      } else {
        params.set('metrics', allowed.join(','));
      }
    } else {
      if (flow === 'balance') {
        params.set('metric', 'value');
      } else {
        if (picked.length > 1) params.set('metrics', picked.join(','));
        else params.set('metric', picked[0] || 'quantity');
      }
    }
    if (countryCodes.length) params.set('countries', countryCodes.join(','));
    // granularity 
    // - Compare/Break Out: use 6 unless commodity breakout uses user choice
    // - Multi HTS auto breakout uses user-selected granularity (default 10)
    // - Otherwise follow current granularity selection
    try {
      const singleHts = (normalizedHts && normalizedHts.length === 1);
      const isBreakout = !!breakoutState.enabled || !!compareEnabled || multiHtsBreakout;
      const isMultiHts = !singleHts && hts.length > 0;
      if (flow === 'balance') {
        params.set('granularity', '6');
      } else if (isBreakout) {
        if (breakoutTarget === 'commodities') {
          params.set('granularity', granularity || '10');
        } else {
          params.set('granularity', '6');
        }
      } else if (isMultiHts) {
        params.set('granularity', granularity);
      }
    } catch {
      if (!params.has('granularity')) params.set('granularity', granularity);
    }
    if (diagnostic) params.set('diagnostic', '1');
    if (compareEnabled) params.set('compare', '1');
    return `/api/get-trade-report?${params.toString()}`;
  }

  const queryKey = useMemo(
    () => [
      'advanced-trends',
      {
        hts,
        normalizedHts,
        countryCodes,
        period,
        flow,
        metrics,
        breakout: breakoutState,
        compareEnabled,
        granularity,
        diagnostic,
      },
    ],
    [hts, normalizedHts, countryCodes, period, flow, metrics, breakoutState, compareEnabled, granularity, diagnostic, breakoutTarget]
  );

  const {
    data: queryData,
    error: queryError,
    isFetching,
    isLoading: isInitialLoading,
    refetch,
  } = useAdvancedTrendsQuery({
    queryKey,
    buildUrl,
    enabled: false,
  });
  const result = queryData?.payload ?? null;
  const adapterMode = queryData?.adapterMode ?? '';
  const adapterCache = queryData?.adapterCache ?? '';
  const requestId = queryData?.requestId ?? '';
  const lastReportBody = queryData?.lastReportBody ?? '';
  const diagDurationMs = queryData?.diagDurationMs ?? null;
  const errorMessage = queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null;
  const isQueryLoading = isFetching || isInitialLoading;

  const run = () => {
    refetch();
  };

  const allowedMetrics = useMemo(() => METRICS.filter(m => m.flow.includes(flow)), [flow]);

  const resolveMetricKey = (table: any): string | null => {
    const raw = (table?.tableInfo?.tabName || table?.tab_name || table?.name || '').toString();
    const s = raw.toLowerCase().replace(/\(in actual.*\)/, '').trim();
    if (s.includes('1st unit') || s.includes('first unit') || s.includes('unit of qty') || s.includes('unit of quantity')) return 'quantity';
    if (s.includes('customs value') || s.includes('trade balance') || s.includes('tot ex fas') || s.includes('fas - genimp') || (s.includes('fas') && s.includes('genimp'))) return 'value';
    if (s.includes('cif')) return 'cif';
    if (s.includes('import charges') || s.includes('charges, insurance, and freight')) return 'charges';
    if (s.includes('calculated duties')) return 'calc_duties';
    if (s.includes('dutiable value')) return 'dutiable';
    if (s.includes('landed duty-paid value') || s.includes('landed duty')) return 'landed';
    return null;
  };

  // --- Start of Robust Data Processing Logic (based on user spec) ---
  type Year = string; // e.g., '2021', '2022', ...
  interface ParsedRow {
    hts10: string;
    hts6: string;
    desc: string;
    unit: string;
    values: Record<Year, number | null>;
  }

  const toNumber = (s?: string | null): number | null => {
    if (!s || s === 'Not Valid' || s.trim() === '') return null;
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const parseTable = (table: any, years: Year[], htsContext: string[]): ParsedRow[] => {
    const rows = table?.row_groups?.flatMap((g: any) => g.rowsNew ?? g.rows ?? []) ?? table?.rows ?? [];
    if (!Array.isArray(rows)) return [];

    // Build column label index map to robustly locate year columns
    const columns = (table?.column_groups || [])
      .flatMap((group: any) => group?.columns || []);
    const columnLabels: string[] = columns.map((col: any) => String(col?.label || ''));
    const yearColumnIndices: number[] = columnLabels
      .map((label, idx) => ((/(19|20)\d{2}/.test(label)) ? idx : -1))
      .filter((idx) => idx >= 0);
    const yearLabelsFromColumns: Year[] = yearColumnIndices.map((idx) => {
      const m = columnLabels[idx].match(/((19|20)\d{2})/);
      return (m ? m[1] : columnLabels[idx].substring(0, 4)) as Year;
    });

    // Derive the actual years present in this table to avoid misalignment
    const tableYears: Year[] = (yearLabelsFromColumns.length ? yearLabelsFromColumns : ((table?.column_groups || [])
      .flatMap((group: any) => group?.columns || [])
      .map((col: any) => String(col?.label || ''))
      .map((label: string) => (label.match(/((19|20)\d{2})/)?.[1] || label.substring(0,4)))
      .filter((label: string) => /^(19|20)\d{2}$/.test(label))) ) as Year[];

    return rows.map((r: any) => {
      const rawEntries = (r.rowEntries || r.entries || []);
      const entries = rawEntries.map((e: any) => (e && typeof e === 'object' && 'value' in e) ? e.value : e);
      let hts = 'TOTAL', desc = '', unit = '', dataStartIndex = -1;
      
      let htsIndex = entries.findIndex((v: string) => htsContext.includes(cleanHtsToSix(String(v))));

      if (htsIndex === -1) {
        htsIndex = entries.findIndex((v: string) => /^\d{10}$/.test(v?.replace(/\./g, '')));
      }
      
      if (htsIndex !== -1) {
        hts = entries[htsIndex];
        desc = entries[htsIndex + 1] || '';
        // Robustly find the start of data columns. It's usually after HTS and Description.
        // Some tables might have a "Unit" column in between.
        const potentialUnitIndex = htsIndex + 2;
        const hasUnitColumn = typeof entries[potentialUnitIndex] === 'string' && !/^\d{4}$/.test(entries[potentialUnitIndex].substring(0,4)) && isNaN(Number(entries[potentialUnitIndex].charAt(0)));
        dataStartIndex = htsIndex + (hasUnitColumn ? 3 : 2);
      } else {
        const ctx6 = Array.isArray(htsContext) && htsContext.length ? cleanHtsToSix(String(htsContext[0])) : '';
        if (ctx6) hts = ctx6;
        unit = String(entries[0] || unit);
        desc = '';
        dataStartIndex = 1;
      }

      const values: Record<Year, number | null> = {};
      if (yearColumnIndices.length) {
        // Prefer mapping by explicit year column indices when available
        yearColumnIndices.forEach((colIdx, i) => {
          const y = yearLabelsFromColumns[i];
          const cell = entries[colIdx];
          const v = (cell && typeof cell === 'object' && 'value' in cell) ? (cell as any).value : cell;
          values[y] = toNumber(typeof v === 'string' ? v : (v != null ? String(v) : null));
        });
      } else {
        // Fallback: map by contiguous data region after descriptors
        const local = (tableYears && tableYears.length) ? tableYears : years;
        local.forEach((y, idx) => {
          const cell = rawEntries[dataStartIndex + idx];
          const raw = (cell && typeof cell === 'object' && 'value' in cell) ? (cell as any).value : (entries[dataStartIndex + idx] ?? null);
          values[y] = toNumber(typeof raw === 'string' ? raw : (raw != null ? String(raw) : null));
        });
      }
      // Ensure keys for union years exist (fill missing with null) so merge steps won't read undefined
      years.forEach((y) => {
        if (!(y in values)) values[y] = null;
      });

      return {
        hts10: hts,
        hts6: cleanHtsToSix(hts),
        desc,
        unit: unit || entries.find((v: string) => typeof v === 'string' && (v.toLowerCase().includes('kilogram') || v.toLowerCase().includes('dollar'))) || '',
        values,
      };
    }).filter(p => p.hts6);
  };

  const sumByHTS6 = (rows: ParsedRow[]): Map<string, Map<Year, number>> => {
    const by = new Map<string, Map<Year, number>>();
    for (const r of rows) {
      if (!r.hts6) continue;
      for (const year of Object.keys(r.values)) {
        const v = r.values[year];
        if (v == null) continue;

        if (!by.has(r.hts6)) {
          by.set(r.hts6, new Map());
        }
        const yearMap = by.get(r.hts6)!;
        yearMap.set(year, (yearMap.get(year) ?? 0) + v);
      }
    }
    return by;
  };

  const aggregateWithDetails = (rows: ParsedRow[]): Map<string, Map<Year, { total: number; details: { hts10: string; value: number }[] }>> => {
    const by = new Map<string, Map<Year, { total: number; details: { hts10: string; value: number }[] }>>();
    for (const r of rows) {
      if (!r.hts6) continue;
      for (const year of Object.keys(r.values)) {
        const v = r.values[year];
        if (v == null) continue;

        if (!by.has(r.hts6)) {
          by.set(r.hts6, new Map());
        }
        const yearMap = by.get(r.hts6)!;
        if (!yearMap.has(year)) {
          yearMap.set(year, { total: 0, details: [] });
        }
        const agg = yearMap.get(year)!;
        agg.total += v;
        agg.details.push({ hts10: r.hts10, value: v });
      }
    }
    return by;
  };
  // --- End of Robust Data Processing Logic ---

  const chartComputation = useMemo(() => {
    const tables = result?.dto?.tables;
    if (!Array.isArray(tables)) return { data: [] as any[], series: [] as SeriesMeta[] };

    const relevant = tables.filter((tb: any) => {
      const name = String(tb?.name || tb?.tab_name || '').toLowerCase();
      return period.ytd ? (name.includes('year-to-date') || name.includes('ytd')) : !(name.includes('year-to-date') || name.includes('ytd'));
    });

    // --- New robust computation flow ---
    // Ensure we find tables only from the relevant period (YTD or Annual)
    const cifTable = relevant.find(t => resolveMetricKey(t) === 'cif');
    const qtyTable = relevant.find(t => resolveMetricKey(t) === 'quantity');
    const chargesTable = relevant.find(t => resolveMetricKey(t) === 'charges');
    const dutiesTable = relevant.find(t => resolveMetricKey(t) === 'calc_duties');
    const valueTable = relevant.find(t => resolveMetricKey(t) === 'value');
    const landedTable = relevant.find(t => resolveMetricKey(t) === 'landed');
    const dutiableTable = relevant.find(t => resolveMetricKey(t) === 'dutiable');

    const getYears = (table: any): Year[] => {
        if (!table) return [];
        return (table.column_groups || [])
            .flatMap((group: any) => group?.columns || [])
            .map((col: any) => String(col?.label || ''))
            .map((label: string) => (label.match(/((19|20)\d{2})/)?.[1] || label.substring(0,4)))
            .filter((label: string) => /^(19|20)\d{2}$/.test(label));
    };

    let years = Array.from(new Set([
        ...getYears(cifTable),
        ...getYears(qtyTable),
        ...getYears(chargesTable),
        ...getYears(dutiesTable),
        ...getYears(valueTable),
        ...getYears(landedTable),
        ...getYears(dutiableTable),
    ])).sort();

    if (years.length === 0) {
      try {
        const first = relevant[0];
        const ci: any[] = first?.row_groups?.[0]?.columnInfo || [];
        const yAlt = ci.filter(c => String(c?.type||'').toLowerCase()==='data')
          .map(c => String(c?.columnLabel||''))
          .map(l => (l.match(/((19|20)\d{2})/)?.[1] || ''))
          .filter(Boolean);
        years = Array.from(new Set(yAlt)).sort();
      } catch {}
    }

    if (years.length === 0) return { data: [], series: [] };

    const cifParsed = cifTable ? parseTable(cifTable, years, normalizedHts) : [];
    const qtyParsed = qtyTable ? parseTable(qtyTable, years, normalizedHts) : [];
    const chargesParsed = chargesTable ? parseTable(chargesTable, years, normalizedHts) : [];
    const dutiesParsed = dutiesTable ? parseTable(dutiesTable, years, normalizedHts) : [];
    const valueParsed = valueTable ? parseTable(valueTable, years, normalizedHts) : [];
    const landedParsed = landedTable ? parseTable(landedTable, years, normalizedHts) : [];
    const dutiableParsed = dutiableTable ? parseTable(dutiableTable, years, normalizedHts) : [];

    // Use aggregateWithDetails for CIF to get reconciliation data
    const cifAggWithDetails = aggregateWithDetails(cifParsed);

    // Use simple sum for other metrics
    const qtyAgg = sumByHTS6(qtyParsed);
    const chargesAgg = sumByHTS6(chargesParsed);
    const dutiesAgg = sumByHTS6(dutiesParsed);
    const valueAgg = sumByHTS6(valueParsed);
    const landedAgg = sumByHTS6(landedParsed);
    const dutiableAgg = sumByHTS6(dutiableParsed);

    const reconciliation: Record<string, any> = {};
    const dataByYear: Record<string, any> = {};
    const seriesMetaMap = new Map<string, SeriesMeta>();

    years.forEach(year => {
      dataByYear[year] = { year };
      normalizedHts.forEach(hts6 => {
        const cifDetail = cifAggWithDetails.get(hts6)?.get(year);
        const cif = cifDetail?.total ?? null;
        const quantity = qtyAgg.get(hts6)?.get(year) ?? null;
        // Customs Value should come from its own table; do not fallback to CIF
        const value = valueAgg.get(hts6)?.get(year) ?? null;

        // --- Guardrails and Reconciliation ---
        let periodWarning: string | null = null;
        if (cifTable && !qtyTable) {
          periodWarning = "CIF=YTD, QTY=Annual/Unavailable";
        }

        // If quantity is unavailable due to period mismatch, nullify dependent metrics (only affects quantity-derived metrics)
        const effectiveQuantity = periodWarning ? null : quantity;

        // Import Charges should come from its own table; do not use fixed percentage
        const charges = chargesAgg.get(hts6)?.get(year) ?? null;
        // Calculated Duties should come from its own table; no placeholder
        const calc_duties = dutiesAgg.get(hts6)?.get(year) ?? null;

        const dutiableDirect = dutiableAgg.get(hts6)?.get(year);
        const dutiable = (dutiableDirect != null) ? dutiableDirect : null;
        const landedDirect = landedAgg.get(hts6)?.get(year);
        // Landed equals CIF + Duties when not directly provided
        const landed = (landedDirect != null)
          ? landedDirect
          : ((cif !== null && calc_duties !== null) ? cif + calc_duties : null);
        const landed_check = (landed !== null && cif !== null && calc_duties !== null) ? landed - (cif + calc_duties) : null;

        if (periodWarning) {
          dataByYear[year].periodWarning = periodWarning;
        }

        dataByYear[year][`${hts6}-quantity`] = effectiveQuantity;
        dataByYear[year][`${hts6}-value`] = value;
        dataByYear[year][`${hts6}-cif`] = cif;
        dataByYear[year][`${hts6}-charges`] = charges;
        dataByYear[year][`${hts6}-calc_duties`] = calc_duties;
        dataByYear[year][`${hts6}-dutiable`] = dutiable;
        dataByYear[year][`${hts6}-landed`] = landed;
        dataByYear[year][`${hts6}-landed_check`] = landed_check;
      });
    });

    normalizedHts.forEach(hts6 => {
        METRICS.forEach(metricInfo => {
            const seriesKey = `${hts6}-${metricInfo.key}`;
            seriesMetaMap.set(seriesKey, {
                key: seriesKey,
                hts: hts6,
                metric: metricInfo.key,
                label: `${hts6} - ${metricInfo.label}`,
            });
        });
    });

    const data = Object.values(dataByYear).sort((a: any, b: any) => parseInt(a.year) - parseInt(b.year));
    const series = Array.from(seriesMetaMap.values());

    // Build reconciliation output
    years.forEach(year => {
      reconciliation[year] = {};
      normalizedHts.forEach(hts6 => {
        const cifDetail = cifAggWithDetails.get(hts6)?.get(year);
        if (cifDetail) {
          const finalValue = data.find(d => d.year === year)?.[`${hts6}-cif`] ?? null;
          const diff = finalValue !== null ? finalValue - cifDetail.total : null;
          reconciliation[year][hts6] = { ...cifDetail, final: finalValue, diff, mismatch: diff !== null && Math.abs(diff) > 1 };
        }
      });
    });

    // Final fallback: if no data series were produced (e.g., Aggregate Annual table with only Quantity Description),
    // synthesize a minimal series from available tables using the input HTS6 (or TOTAL) as key.
    if ((!data || data.length === 0) && Array.isArray(relevant) && relevant.length > 0) {
      try {
        const keyHts = (normalizedHts && normalizedHts.length ? normalizedHts[0] : 'TOTAL');
        const fallback: any = { };
        years.forEach(y => { fallback[y] = { year: y } });
        const takeVal = (t: any): number | null => {
          const row = t?.row_groups?.[0]?.rowsNew?.[0]?.rowEntries || [];
          const cols = (t?.column_groups?.[1]?.columns || []).map((c: any)=> String(c?.label||''));
          // pick last data cell
          const cell = row[row.length - 1];
          const raw = (cell?.value ?? cell ?? null);
          const n = toNumber(typeof raw === 'string' ? raw : (raw != null ? String(raw) : null));
          return n;
        };
        const pick = (name: string) => relevant.find(t => String(t?.tableInfo?.tabName||t?.tab_name||'').toLowerCase().includes(name));
        const tQty = pick('first unit') || pick('quantity');
        const tVal = pick('customs value');
        const tCif = pick('cif');
        const tChg = pick('charges') || pick('insurance');
        const tDut = pick('calculated duties');
        const tDutVal = pick('dutiable');
        const tLanded = pick('landed');
        const lastYear = years[years.length - 1];
        const setIf = (metricKey: string, table: any) => {
          const v = takeVal(table);
          if (v != null) {
            if (!fallback[lastYear]) fallback[lastYear] = { year: lastYear };
            fallback[lastYear][`${keyHts}-${metricKey}`] = v;
            seriesMetaMap.set(`${keyHts}-${metricKey}`, { key: `${keyHts}-${metricKey}`, hts: keyHts, metric: metricKey, label: `${keyHts} - ${metricKey}` });
          }
        };
        setIf('quantity', tQty);
        setIf('value', tVal);
        setIf('cif', tCif);
        setIf('charges', tChg);
        setIf('calc_duties', tDut);
        setIf('dutiable', tDutVal);
        setIf('landed', tLanded);
        const synth = Object.values(fallback).filter((r:any)=> Object.keys(r).length>1);
        if (synth.length) {
          const synthesizedSeries = Array.from(seriesMetaMap.values());
          return { data: synth as any[], series: synthesizedSeries, reconciliation, relevant, years } as any;
        }
      } catch {}
    }
    // Final fallback: robust annual extractor using row_groups.columnInfo indices
    if ((!data || data.length === 0) && Array.isArray(relevant) && relevant.length > 0) {
      try {
        const keyHts = (normalizedHts && normalizedHts.length ? normalizedHts[0] : 'TOTAL');
        const out: Record<string, any> = {};
        const getYear = (label: string) => {
          const m = String(label||'').match(/\b(19|20)\d{2}\b/);
          return m ? m[0] : null;
        };
        const getMetric = (tabName: string) => {
          const s = String(tabName||'').toLowerCase();
          if (s.includes('first unit') || s.includes('unit of quantity')) return 'quantity';
          if (s.includes('customs value')) return 'value';
          if (s.includes('cif import value') || s.includes('cif')) return 'cif';
          if (s.includes('import charges') || s.includes('charges, insurance')) return 'charges';
          if (s.includes('calculated duties')) return 'calc_duties';
          if (s.includes('dutiable value')) return 'dutiable';
          if (s.includes('landed duty-paid')) return 'landed';
          return null;
        };
        for (const t of relevant) {
          const tabName = t?.tableInfo?.tabName || t?.tab_name || t?.name || '';
          const metricKey = getMetric(tabName);
          if (!metricKey) continue;
          const rgs: any[] = Array.isArray(t?.row_groups) ? t.row_groups : [];
          for (const rg of rgs) {
            const infos: any[] = Array.isArray(rg?.columnInfo) ? rg.columnInfo : [];
            const dataInfo = infos.find(ci => String(ci?.type||'').toLowerCase()==='data');
            const dataIdx0 = ((dataInfo?.columnIndex ?? 2) as number) - 1; // 1-based ??0-based
            const yr = getYear(dataInfo?.queryResultLabel || '') || (years[years.length-1] as string);
            const rowsN: any[] = Array.isArray(rg?.rowsNew) ? rg.rowsNew : [];
            for (const r of rowsN) {
              const rowEntries = Array.isArray(r?.rowEntries) ? r.rowEntries : [];
              const cell = rowEntries[dataIdx0];
              const suppressed = cell?.suppressed === 1;
              const raw = cell?.value ?? null;
              const num = suppressed ? null : toNumber(raw);
              if (!out[yr]) out[yr] = { year: yr };
              if (num != null) out[yr][`${keyHts}-${metricKey}`] = num;
            }
          }
        }
        const synth = Object.values(out) as any[];
        if (synth.length) {
          // auto-build series for present metric keys
          const sample = synth[0] as any;
          Object.keys(sample).filter(k => k.includes('-')).forEach(k => {
            const [h, m] = k.split('-');
            seriesMetaMap.set(k, { key: k, hts: h, metric: m, label: `${h} - ${m}` } as SeriesMeta);
          });
        }
        const synthesizedSeries = Array.from(seriesMetaMap.values());
        if (synth.length) {
          return { data: synth, series: synthesizedSeries, reconciliation, relevant, years } as any;
        }
      } catch {}
    }
    return { data, series, reconciliation, relevant, years } as any;
  }, [result, period.ytd, normalizedHts]);

  const chartData = chartComputation.data;
  const availableSeries = chartComputation.series;
  const relevantTables: any[] = (chartComputation as any)?.relevant || [];
  const allYears: string[] = (chartComputation as any)?.years || [];



  const lineSeries = useMemo(() => {
    if (!availableSeries.length) return [] as SeriesWithStyle[];
    const desiredSet = new Set(normalizedHts);
    const metricSet = new Set(metrics);
    const metricOrder = METRICS.map(m => m.key);

    const baseOrder: string[] = normalizedHts.length
      ? normalizedHts
      : Array.from(new Set(availableSeries.map((s: SeriesMeta) => s.hts).filter((code: string) => !code.startsWith('TOTAL'))));
    const effectiveBase: string[] = baseOrder.length ? baseOrder : Array.from(new Set(availableSeries.map((s: SeriesMeta) => s.hts)));

    return availableSeries
      .filter((series: SeriesMeta) => metricSet.has(series.metric))
      .filter((series: SeriesMeta) => desiredSet.size === 0 || desiredSet.has(series.hts) || series.hts.startsWith('TOTAL'))
      .map((series: SeriesMeta, idx: number) => {
        const htsIndex = effectiveBase.indexOf(series.hts);
        const safeHtsIndex = htsIndex >= 0 ? htsIndex : effectiveBase.length;
        const metricIndex = Math.max(0, metricOrder.indexOf(series.metric));
        const paletteIndex = (safeHtsIndex * metricOrder.length + metricIndex);
        const color = chartSlotColor(paletteIndex, chartColors);
        return {
          ...series,
          label: `${series.hts} - ${getMetricLabel(series.metric)}`,
          color,
          strokeDasharray: METRIC_STROKES[series.metric],
        };
      });
  }, [availableSeries, metrics, normalizedHts, metricLabelMap, chartColors]);

  useEffect(() => {
    if (!compareEnabled) return;
    if (allYears && allYears.length) {
      if (!compareYearA) setCompareYearA(allYears[allYears.length - 1]);
      if (!compareYearB) setCompareYearB(allYears[Math.max(0, allYears.length - 2)]);
    }
  }, [compareEnabled, allYears]);

  const compareLabelYears = useMemo(() => {
    const numA = Number(compareYearA);
    const numB = Number(compareYearB);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numB > numA) {
      return { primary: compareYearB, secondary: compareYearA };
    }
    return { primary: compareYearA, secondary: compareYearB };
  }, [compareYearA, compareYearB]);

  // Compare YearA/YearB
  const compareData = useMemo(() => {
    try {
      if (!compareEnabled) return [] as any[];
      const allowedKeys = new Set(allowedMetrics.map(m => m.key));
      const metricKeys: string[] = (metrics && metrics.length)
        ? metrics.filter(k => allowedKeys.has(k))
        : allowedMetrics.map(m => m.key);

      // Build diffs per metric per country
      const recordByCountry = new Map<string, any>();

      for (const metricKey of metricKeys) {
        const table = relevantTables.find(t => resolveMetricKey(t) === (metricKey === 'value' ? 'value' : metricKey));
        if (!table) continue;
        const flatCols: any[] = ((table?.column_groups || [])
          .flatMap((g: any) => g?.columns || []));
        const tableYears: string[] = (flatCols
          .map((c: any) => String(c?.label || '').substring(0, 4))
          .filter((label: string) => /^(19|20)\d{2}/.test(label))) as string[];
        if (!tableYears.length) continue;
        const years = tableYears;
        // Build a direct map from year -> column index in row entries
        const yearToColIndex: Record<string, number> = {};
        flatCols.forEach((c: any, idx: number) => {
          const y = String(c?.label || '').substring(0, 4);
          if (/^(19|20)\d{2}/.test(y) && !(y in yearToColIndex)) yearToColIndex[y] = idx;
        });
        const yA = compareYearA && years.includes(compareYearA) ? compareYearA : (years.length ? years[years.length-1] : '');
        const yB = compareYearB && years.includes(compareYearB) ? compareYearB : (years.length>1 ? years[years.length-2] : '');
        const colA = yearToColIndex[yA];
        const colB = yearToColIndex[yB];
        if (colA == null || colB == null) continue;
        const rows = (table?.row_groups?.[0]?.rowsNew) || (table?.row_groups?.[0]?.rows) || table?.rows || [];
        for (const r of rows) {
          const e = r?.rowEntries || r?.entries || [];
          const country = String(e?.[0]?.value ?? e?.[0] ?? 'N/A');
          const cellA = e[colA];
          const cellB = e[colB];
          const vA = (cellA && typeof cellA === 'object' && 'value' in cellA) ? (cellA as any).value : cellA;
          const vB = (cellB && typeof cellB === 'object' && 'value' in cellB) ? (cellB as any).value : cellB;
          const toNum = (raw: any): number | null => {
            if (raw == null) return null;
            const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
            if (!cleaned.length) return null;
            const n = Number(cleaned);
            return Number.isFinite(n) ? n : null;
          };
          const valA = toNum(vA);
          const valB = toNum(vB);
          if (valA == null || valB == null) continue;
          const numYA = Number(yA);
          const numYB = Number(yB);
          const useAAsTarget = Number.isFinite(numYA) && Number.isFinite(numYB) ? (numYA >= numYB) : true;
          const targetVal = useAAsTarget ? valA : valB;
          const baseVal = useAAsTarget ? valB : valA;
          const baseIsZero = baseVal === 0;
          const diff = compareMode === 'pct'
            ? (baseIsZero ? null : (targetVal - baseVal) / Math.abs(baseVal))
            : (targetVal - baseVal);
          if (diff == null) continue;
          const rec = recordByCountry.get(country) || { year: country };
          rec[metricKey] = diff;
          recordByCountry.set(country, rec);
        }
      }

      let out = Array.from(recordByCountry.values());
      const sortMetric = (allowedKeys.has(compareMetric) ? compareMetric : (allowedKeys.has('quantity') ? 'quantity' : (metricKeys[0] || 'quantity')));
      const sorter = (a: any, b: any) => {
        const av = Number(a?.[sortMetric] ?? 0);
        const bv = Number(b?.[sortMetric] ?? 0);
        const va = compareSort==='abs' ? Math.abs(av) : av;
        const vb = compareSort==='abs' ? Math.abs(bv) : bv;
        return (compareSort==='asc') ? (va - vb) : (vb - va);
      };
      out = out.sort(sorter).slice(0, Math.max(1, compareTopN));
      return out;
    } catch { return [] }
  }, [compareEnabled, metrics, allowedMetrics, compareMetric, relevantTables, compareYearA, compareYearB, compareMode, compareTopN, compareSort]);

  return (
    <div className="space-y-6 p-4">
      <Card className="rounded-2xl shadow-md">
        <CardHeader><CardTitle>{t('market.advanced.title')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Group 1: HTS, Granularity, Breakout */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('market.advanced.htsLabel')}</label>
                <Input value={localHtsInput} onChange={handleHtsChange} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder={t('market.advanced.htsPlaceholder')} className="w-full mt-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('market.advanced.granularity')}</label>
                <ToggleGroup 
                  type="single" 
                  value={granularity} 
                  onValueChange={(value) => { if (value) setGranularity(value as '6'|'8'|'10')}}
                  className="justify-start"
                >
                  <ToggleGroupItem value="6">{t('market.advanced.granularity6')}</ToggleGroupItem>
                  <ToggleGroupItem value="8">{t('market.advanced.granularity8')}</ToggleGroupItem>
                  <ToggleGroupItem value="10">{t('market.advanced.granularity10')}</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('market.advanced.breakout')}</label>
                <Select value={breakoutTarget} onValueChange={(v: 'countries'|'commodities') => setBreakoutTarget(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commodities">{t('market.advanced.breakoutCommodities')}</SelectItem>
                    <SelectItem value="countries">{t('market.advanced.breakoutCountries')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group 2: Trade Flow, Metrics */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('market.advanced.tradeFlow')}</label>
                <Select value={flow} onValueChange={(value: Flow) => setFlow(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cons">{flowLabels.cons}</SelectItem>
                        <SelectItem value="gen">{flowLabels.gen}</SelectItem>
                        <SelectItem value="balance">{flowLabels.balance}</SelectItem>
                    </SelectContent>
                </Select>
                {flow === 'balance' && (
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-500 bg-warning/10 border border-warning/20 rounded p-2">
                    <div className="font-medium">{t('market.advanced.balanceNoticeTitle')}</div>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {(t('market.advanced.balanceNoticeItems', { returnObjects: true }) as string[]).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('market.advanced.metrics')}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10">
                      {metrics.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {metrics.slice(0, 3).map(mKey => {
                            const metric = getMetricLabel(mKey);
                            return <Badge key={mKey} variant="secondary">{metric}</Badge>
                          })}
                          {metrics.length > 3 && <Badge variant="outline">{t('market.advanced.metricsMore', { count: metrics.length - 3 })}</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('market.advanced.metricsPlaceholder')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandEmpty>{t('market.advanced.metricsEmpty')}</CommandEmpty>
                        <CommandGroup>
                          <TooltipProvider>
                            {METRICS.map(m => {
                              const isAllowed = allowedMetrics.some(am => am.key === m.key);
                              const isSelected = metrics.includes(m.key);
                              const handleSelect = () => {
                                if (!isAllowed) return;
                                setMetrics(prev => 
                                  isSelected 
                                    ? prev.filter(item => item !== m.key)
                                    : Array.from(new Set([...prev, m.key]))
                                );
                              };
                              if (isAllowed) {
                                return (
                                  <CommandItem key={m.key} value={getMetricLabel(m.key)} onSelect={handleSelect} className="flex items-center justify-between cursor-pointer">
                                    <span className="flex-1">{getMetricLabel(m.key)}</span>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              }
                              return (
                                <Tooltip key={m.key} delayDuration={100}>
                                  <TooltipTrigger asChild>
                                    <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm opacity-50 outline-none">
                                      {getMetricLabel(m.key)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{t('market.advanced.metricsUnavailable', { flow: flowLabels[flow] || flow })}</p></TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </TooltipProvider>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Group 3: Period, Countries, Diagnostic */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">{t('market.advanced.period')}</label>
                <div className="mt-1 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <Checkbox checked={period.ytd} onCheckedChange={(checked: boolean) => setPeriod({ ...period, ytd: Boolean(checked) })} />
                      {t('market.advanced.ytd')}
                    </label>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="text-xs">{t('market.advanced.historyYears', { years: period.years })}</div>
                    <Slider value={[period.years]} onValueChange={(value: number[]) => setPeriod({ ...period, years: value[0] || 5 })} min={1} max={20} step={1} className="flex-1" />
                  </div>
                </div>
              </div>
              <div>
                <CountrySelector countryCodes={countryCodes} setCountryCodes={setCountryCodes} />
                {countryCodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {countryCodes.map((code: string) => {
                      const opt = countries.find((o: any) => o.value === code);
                      const label = opt?.name || code;  
                      return (
                        <span key={code} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {label}  
                          <button className="text-muted-foreground hover:text-foreground" aria-label={t('market.advanced.removeCountry')} title={t('market.advanced.removeCountry')} onClick={() => setCountryCodes(countryCodes.filter((c: string) => c !== code))}>x</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{t('market.advanced.diagnostic')}</label>
                <div className="mt-1 flex items-center gap-2">
                  <Checkbox id="diag-check" checked={diagnostic} onCheckedChange={(checked: boolean) => setDiagnostic(Boolean(checked))} />
                  <label htmlFor="diag-check" className="text-xs text-muted-foreground">{t('market.advanced.showRequestBody')}</label>
                  {(adapterMode || adapterCache) && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{adapterMode}{adapterCache?` · ${adapterCache}`:''}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Group 4: Compare, Run Query */}
            <div className="space-y-4">
              <div>
                  <div className="flex items-center gap-2">
                      <Checkbox id="compare-enabled" checked={compareEnabled} onCheckedChange={(checked: boolean) => setCompareEnabled(Boolean(checked))} />
                      <label htmlFor="compare-enabled" className="text-sm text-muted-foreground">{t('market.advanced.compareToggle')}</label>
                  </div>
                  {compareEnabled && (
                      <div className="grid grid-cols-2 gap-2 text-sm p-2 border rounded-lg mt-2">
                          <div className="col-span-2 grid grid-cols-2 gap-2">
                          <div>
                              <label className="text-xs text-muted-foreground">{t('market.advanced.yearA')}</label>
                              <Select value={compareYearA} onValueChange={setCompareYearA}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{allYears.map(y=> <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div>
                              <label className="text-xs text-muted-foreground">{t('market.advanced.yearB')}</label>
                              <Select value={compareYearB} onValueChange={setCompareYearB}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{allYears.map(y=> <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div>
                              <label className="text-xs text-muted-foreground">{t('market.advanced.diff')}</label>
                              <Select value={compareMode} onValueChange={(v: string) => setCompareMode(v as any)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="abs">{t('market.advanced.diffAbsolute')}</SelectItem>
                                      <SelectItem value="pct">{t('market.advanced.diffPercent')}</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <label className="text-xs text-muted-foreground">{t('market.advanced.topN')}</label>
                              <Input type="number" min={1} max={20} 
                                  value={compareTopN}
                                  onChange={(e)=>setCompareTopN(Math.max(1, Math.min(20, parseInt(e.target.value||'10',10))))}
                              />
                          </div>
                          </div>
                      </div> 
                  )}
              </div>
              <div className="flex items-end h-full">
                <Button onClick={run} disabled={isQueryLoading} className="w-full">{isQueryLoading ? t('market.advanced.running') : t('market.advanced.run')}</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="min-w-0">
        <Card className="w-full rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>{t('market.advanced.results')}</CardTitle>
          </CardHeader>
          <CardContent className="w-full">
          {compareEnabled && compareData.length > 0 && (
            <div className="w-full overflow-x-auto">
              <div ref={chartCallbackRef} className="min-w-[720px]">
                {canRenderCharts ? (
                  <ResponsiveContainer width="100%" height={fallbackHeight}>
                    <BarChart key={`compare:${compareMetric}:${compareSort}:${compareTopN}`} data={compareData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v: any)=> (compareMode==='pct'? (v as number).toLocaleString(undefined,{style:'percent',minimumFractionDigits:2}) : (v as number).toLocaleString())} />
                      <YAxis type="category" dataKey="year" width={140} />
                      <RechartsTooltip formatter={(value: number, name) => (compareMode==='pct'? (value as number).toLocaleString(undefined,{style:'percent',minimumFractionDigits:2}) : (value as number).toLocaleString())} />
                      <Legend />
                      <Bar
                        key={compareMetric}
                        dataKey={compareMetric}
                        name={t('market.advanced.barName', { label: getMetricLabel(compareMetric), yearA: compareLabelYears.primary || '-' , yearB: compareLabelYears.secondary || '-' })}
                        fill={chartSlotColor(0, chartColors)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[384px] flex items-center justify-center text-sm text-muted-foreground">
                    {t('market.chart.preparing')}
                  </div>
                )}
              </div>
            </div>
          )}
          {compareEnabled && compareData.length > 0 && (
            <div className="mt-4">
              {(() => {
                const allowedKeys = new Set(allowedMetrics.map(m => m.key));
                const metricKeys: string[] = (metrics && metrics.length)
                  ? metrics.filter(k => allowedKeys.has(k))
                  : allowedMetrics.map(m => m.key);
                const columns = [
                  { key: 'year', label: t('market.advanced.countryLabel') },
                  ...metricKeys.map(k => ({ key: k, label: getMetricLabel(k) }))
                ];
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <h4 className="text-sm font-semibold text-foreground">{t('market.advanced.compareTable')}</h4>
                        <span className="text-[11px]">{t('market.advanced.compareDiffLabel', { mode: compareMode === 'pct' ? t('market.advanced.diffPercent') : t('market.advanced.diffAbsolute') })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">{t('market.advanced.compareSortBy')}</label>
                        <Select value={compareMetric} onValueChange={(v: string) => setCompareMetric(v as any)}>
                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                            <SelectContent>{allowedMetrics.map(m => (<SelectItem key={m.key} value={m.key}>{getMetricLabel(m.key)}</SelectItem>))}</SelectContent>
                        </Select>
                        <label className="text-xs text-muted-foreground">{t('market.advanced.compareOrder')}</label>
                        <Select value={compareSort} onValueChange={(v: string) => setCompareSort(v as any)}>
                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="abs">{t('market.advanced.orderAbs')}</SelectItem>
                                <SelectItem value="desc">{t('market.advanced.orderDesc')}</SelectItem>
                                <SelectItem value="asc">{t('market.advanced.orderAsc')}</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                    </div>
                                        {/* TanStack Compare (並列預覽) */}
                    <div className="mt-2 overflow-x-auto">
                      <div className="min-w-[720px]">
                        <CompareTableTanstack onRequestGlobalSort={(key, desc) => { try { if (key && key !== 'year') { if (key !== compareMetric) { setCompareMetric(key as any); } 
  setCompareSort((prev)=> (prev==='abs' ? 'abs' : (desc ? 'desc' : 'asc')) as any);
 } } catch {} }} currentSortKey={compareMetric} currentSortDesc={(compareSort==='desc'||compareSort==='abs')} 
                          data={compareData}
                          columns={columns as any}
                          percent={compareMode==='pct'}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
            {errorMessage && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('status.error')}</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}
            {!compareEnabled && !errorMessage && !isQueryLoading && chartData.length > 0 && lineSeries.length > 0 && (
              <div className="w-full overflow-x-auto">
                <div ref={chartCallbackRef} className="min-w-[720px]" style={{ minHeight: 384 }}>
                  {canRenderCharts ? (
                    <ResponsiveContainer width="100%" height={fallbackHeight}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 20, left: 12, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value: any) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                        <RechartsTooltip formatter={(value: number) => (value as number).toLocaleString()} />
                        <Legend />
                        {lineSeries.map((series: SeriesWithStyle) => (
                          <Area
                            key={series.key}
                            type="monotone"
                            dataKey={series.key}
                            name={series.label}
                            stroke={series.color}
                            fill={series.color}
                            fillOpacity={0.22}
                            strokeWidth={2}
                            strokeDasharray={series.strokeDasharray}
                            activeDot={{ r: 3 }}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[384px] flex items-center justify-center text-sm text-muted-foreground">
                      {t('market.chart.preparing')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!compareEnabled && !errorMessage && !isQueryLoading && chartData.length > 0 && lineSeries.length > 0 && (
              <div className="mt-6">
                <h4 className="text-base font-semibold mb-2">{t('market.advanced.dataTable')}</h4>
                {/* TanStack Data Table (並列預覽) */}
                <div className="mt-2 overflow-x-auto">
                  <div className="min-w-[720px]">
                    <DataTableTanstack data={chartData} columns={[{ key: 'year', label: t('market.advanced.yearLabel') }, ...lineSeries.map((s: SeriesWithStyle) => ({ key: s.key, label: s.label }))]} />
                  </div>
                </div>
              </div>
            )}
{!errorMessage && !isQueryLoading && chartData.length > 0 && lineSeries.length === 0 && (

<div className="text-xs text-amber-600 dark:text-amber-500 mt-2">{t('market.advanced.noSeries')}</div> 
)}
            {!errorMessage && !isQueryLoading && chartData.length === 0 && (
              <div className="text-sm text-muted-foreground mt-2">{t('market.advanced.noSeries')}</div>
            )}
            {!errorMessage && !isQueryLoading && result && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">{t('market.advanced.processedTitle')}</h4>
                  <button className="text-xs text-muted-foreground underline" onClick={()=>setProcessedOpen(v=>!v)}>{processedOpen ? t('actions.close') : t('actions.open')}</button>
                </div>
                {processedOpen && (
                  <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-xs">{JSON.stringify(chartData, null, 2)}</pre>
                )}
              </div>
            )}
            {!errorMessage && !isQueryLoading && chartComputation.reconciliation && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">{t('market.advanced.reconciliationTitle')}</h4>
                  <button className="text-xs text-muted-foreground underline" onClick={()=>setRecoOpen(v=>!v)}>{recoOpen ? t('actions.close') : t('actions.open')}</button>
                </div>
                {recoOpen && (
                  <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-xs">{JSON.stringify(chartComputation.reconciliation, null, 2)}</pre>
                )}
              </div>
            )}
            {diagnostic && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">{t('market.advanced.diagnostics')}</h4>
                  <div className="flex items-center gap-2">
                    {(adapterMode || adapterCache) && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{adapterMode}{adapterCache?` ??${adapterCache}`:''}</span>
                    )}
                    {diagDurationMs != null && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border">{`${Math.round(diagDurationMs)} ms`}</span>
                    )}
                    <button className="text-xs text-muted-foreground underline" onClick={() => { try { navigator.clipboard.writeText(diagSummaryText); } catch {} }}>
                      {t('market.advanced.copySummary')}
                    </button>
                    <button className="text-xs text-muted-foreground underline" onClick={()=>setDiagOpen(v=>!v)}>
                      {diagOpen ? t('actions.close') : t('actions.open')}
                    </button>
                  </div>
                </div>
                {diagOpen && (
                  <div className="space-y-3 mt-2">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{t('market.advanced.requestSummary')}</div>
                      <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-[12px]">{diagSummaryText}</pre>
                    </div>
                    {(adapterMode || adapterCache || requestId) && (
                      <div>
                        <div className="text-xs font-semibold text-foreground">{t('market.advanced.headers')}</div>
                        <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-[12px]">{JSON.stringify({ 'X-Adapter-Mode': adapterMode, 'X-Cache': adapterCache, 'X-Request-ID': requestId }, null, 2)}</pre>
                      </div>
                    )}
                    {lastReportBody && (
                      <div>
                        <div className="text-xs font-semibold text-foreground">{t('market.advanced.reportBody')}</div>
                        <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-[12px]">{lastReportBody}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!errorMessage && isQueryLoading && (  
              <div className="mt-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            )}
            {!errorMessage && !isQueryLoading && !result && <div className="text-sm text-muted-foreground">{t('market.advanced.runPrompt')}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}











