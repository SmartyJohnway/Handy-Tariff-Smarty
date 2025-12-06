import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';
import { useMarketTrendsChartQuery } from '@/hooks/queries/useMarketTrendsChartQuery';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const colorVar = (idx = 1): string => {
  const i = ((idx - 1) % 5) + 1;
  return `rgb(var(--chart-${i}))`;
};

const DISPLAY_SERIES = ['Top1', 'Top2', 'Top3', 'Others'] as const;
const BAR_STACK_ORDER = ['Others', 'Top3', 'Top2', 'Top1'] as const; // Bottom ??Top
const breakoutTooltipFilter = (payload: any[] = []) => {
  const uniq: Record<string, any> = {};
  for (const p of payload) {
    if (!p || !p.name) continue;
    if (!uniq[p.name]) uniq[p.name] = p;
  }
  return Object.values(uniq);
};

const BreakoutTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const filtered = breakoutTooltipFilter(payload);
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow">
      <div className="font-medium text-foreground mb-1">{label}</div>
      <div className="space-y-1">
        {filtered.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: p.color }} />
            <span className="text-foreground">{p.name}: {(p.value as number)?.toLocaleString?.() || p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const selectTableForMode = (resp: any, ytd: boolean) => {
  try {
    const tables = resp?.dto?.tables;
    if (!Array.isArray(tables) || !tables.length) return null;
    if (ytd) {
      const idx = tables.findIndex((tb: any) => {
        const name = String(tb?.name || tb?.tab_name || '').toLowerCase();
        const hasYtdName = name.includes('year-to-date') || name.includes('ytd');
        const cg = tb?.column_groups?.[1]?.columns || [];
        const firstLabel = cg.length ? String(cg[0]?.label || '').toLowerCase() : '';
        const hasYtdCols = firstLabel.includes('year_to_date');
        return hasYtdName || hasYtdCols;
      });
      if (idx >= 0) return { dto: { tables: [tables[idx]] } };
    }
    return { dto: { tables: [tables[0]] } };
  } catch {
    return null;
  }
};


interface MarketTrendsChartProps {

  htsCode: string;

  defaultAdcvdCountries?: string[]; // country names from AD/CVD tracker, optional

}



interface ParsedReportData {
    year: string;
    quantity: number;
    unit: string;
}

// Helper to detect which year should be used for Break Out Top N label
const normalizeYearLabel = (label: any): string => {
    const s = String(label || '').trim();
    const m = s.match(/(19|20)\d{2}/);
    return m ? m[0] : s;
};

const detectBreakoutYear = (apiResponse: any): string | null => {
    try {
        const table = apiResponse?.dto?.tables?.[0];
        if (!table) return null;
        const groups = Array.isArray(table.column_groups) ? table.column_groups : [];
        let yearGroup: any = groups.find((g: any) => Array.isArray(g?.columns) && g.columns.length > 0 && g.columns.every((c: any) => /(19|20)\d{2}/.test(String(c?.label))));
        if (!yearGroup) {
            yearGroup = [...groups].reverse().find((g: any) => Array.isArray(g?.columns) && g.columns.some((c: any) => /(19|20)\d{2}/.test(String(c?.label))));
        }
        const years: string[] = Array.isArray(yearGroup?.columns) ? yearGroup.columns.map((c: any) => normalizeYearLabel(c.label)) : [];
        if (!years.length) return null;
        const rows = (table.row_groups?.[0]?.rowsNew) || (table.row_groups?.[0]?.rows) || (table.rows) || [];
        // Find last year index that has any non-zero
        let pickIdx = years.length - 1;
        for (let i = years.length - 1; i >= 0; i--) { // @ts-ignore
            const anyNonZero = rows.some((r: any) => {
                const entries = (r?.rowEntries || r?.entries || []);
                const baseIndex = Math.max(0, entries.length - years.length);
                const cell = entries[baseIndex + i] ?? 0;
                const raw = (cell?.value ?? cell ?? '0').toString();
                const value = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
                return value > 0;
            });
            if (anyNonZero) { pickIdx = i; break; }
        }
        return String(years[pickIdx] ?? '');
    } catch {
        return null;
    }
};

// New, simplified parser for the known-good API response
const extractYears = (apiResponse: any): string[] => {
    try {
        const table = apiResponse?.dto?.tables?.[0];
        if (!table) return [];
        const groups = Array.isArray(table.column_groups) ? table.column_groups : [];
        let yearGroup: any = groups.find((g: any) => Array.isArray(g?.columns) && g.columns.length > 0 && g.columns.every((c: any) => /(19|20)\d{2}/.test(String(c?.label))));
        if (!yearGroup) yearGroup = [...groups].reverse().find((g: any) => Array.isArray(g?.columns) && g.columns.some((c: any) => /(19|20)\d{2}/.test(String(c?.label))));
        return Array.isArray(yearGroup?.columns) ? yearGroup.columns.map((c: any) => normalizeYearLabel(c.label)) : [];
    } catch { return []; }
};

const parseReport = (apiResponse: any, indicator: 'quantity'|'value', breakout: boolean, topN: number, pickYear?: string | null): ParsedReportData[] => {
    if (breakout) {
        try {
            const table = apiResponse?.dto?.tables?.[0];
            if (!table) return [];
            const years: string[] = extractYears(apiResponse);

            const rows = (table.row_groups?.[0]?.rowsNew) || (table.row_groups?.[0]?.rows) || (table.rows) || [];

            const parsedRows = rows.filter(Boolean).map((r: any) => {
                const entries = (r?.rowEntries || r?.entries || []);
                const country = String(entries?.[0]?.value ?? entries?.[0] ?? 'N/A');
                const unit = String(entries?.[1]?.value ?? entries?.[1] ?? (indicator === 'value' ? 'USD' : 'number'));
                const baseIndex = Math.max(0, entries.length - years.length);
                const series = years.map((_, i) => {
                    const valEntryRaw = entries[baseIndex + i] ?? 0;
                    const raw = (valEntryRaw?.value ?? valEntryRaw ?? '0').toString();
                    const value = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
                    return value;
                });
                return { country, unit, series };
            });

            let pickIdx = years.length > 0 ? years.length - 1 : 0;
            if (pickYear && years.includes(String(pickYear))) {
                pickIdx = years.indexOf(String(pickYear));
            } else { // @ts-ignore
                for (let i = years.length - 1; i >= 0; i--) {
                    const anyNonZero = parsedRows.some((r: any) => (r.series?.[i] ?? 0) > 0);
                    if (anyNonZero) { pickIdx = i; break; }
                }
            }

            const scored = parsedRows.map((r: any) => ({ country: r.country, unit: r.unit, value: r.series?.[pickIdx] ?? 0 }));
            const sorted = scored.sort((a: any, b: any) => b.value - a.value).slice(0, Math.max(1, topN));
            return sorted.map((s: any) => ({ year: s.country, quantity: s.value, unit: s.unit }));
        } catch (e) {
            
            return [];
        }
    }
    try {
        const table = apiResponse?.dto?.tables?.[0];
        if (!table) return [];

        const years = extractYears(apiResponse);
        if (!years.length) return [];

        const quantityRow = table.row_groups?.[0]?.rowsNew?.[0]?.rowEntries || table.row_groups?.[0]?.rows?.[0]?.entries || [];

        const unit = indicator === 'value' ? 'USD' : (quantityRow[0]?.value || 'number');

        const results: ParsedReportData[] = [];

        years.forEach((year: string, index: number) => {
            const quantity = parseFloat(String(quantityRow[index + 1]?.value ?? '0').replace(/,/g, '')) || 0;
            results.push({ year, quantity, unit });
        });

        const currentYear = new Date().getFullYear();
        return results;
    } catch (e) {

        

        return [];

    }

};



import { loadCountriesCached, refreshCountries, mapCountryNamesToCodes, cleanHtsToSix, lastNYearsFromData, CountryOption } from '@/utils/countries';
import { useSearch } from '@/context/SearchContext';
import { useMarketTrends } from '@/context/MarketTrendsContext';
import { CountrySelector } from '@/components/intelligence/CountrySelector';



export const MarketTrendsChart: React.FC<MarketTrendsChartProps> = ({ htsCode, defaultAdcvdCountries = [] }) => {
  const { setActiveTab } = useSearch();
  const [showTable, setShowTable] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [isRefreshingCountries, setIsRefreshingCountries] = useState(false);
  const [useAllCountries, setUseAllCountries] = useState(true);
  const [selectedYearsBreakout, setSelectedYearsBreakout] = useState<string[]>([]);
  type Flow = 'cons' | 'gen';
  type Metric = 'quantity' | 'value' | 'cif' | 'charges' | 'calc_duties' | 'dutiable' | 'landed';

  const {
    hts: contextHts,
    setHts: setContextHts,
    countryCodes,
    setCountryCodes,
    period,
    setPeriod,
    flow,
    setFlow,
    metrics,
    setMetrics,
    breakout: breakoutState,
    setBreakout: setBreakoutState,
  } = useMarketTrends();

  // Helper to set single metric while keeping context state shape
  const setMetric = (m: Metric) => setMetrics([m]);
  const metric: Metric = (metrics[0] as Metric) || 'quantity';

  const { enabled: breakout, topN, year: selectedBreakoutYear } = breakoutState;
  const { years: historyYears, ytd } = period;

  // Whether to sync Intelligence HTS to Advanced Trends context (no auto navigation)
  const [syncToAdvanced, setSyncToAdvanced] = useState<boolean>(false);
  // Diagnostic toggle to surface final reportBody from server (via X-Report-Body header)
  const [diagnostic, setDiagnostic] = useState<boolean>(false);
  const [diagPanelOpen, setDiagPanelOpen] = useState(false);
  
  // Persist sync preference
  useEffect(() => { try { localStorage.setItem("mt_sync_to_adv", syncToAdvanced ? "1" : "0"); } catch {} }, [syncToAdvanced]);
  

  
  function buildFetchUrl(): string {
    const params = new URLSearchParams();
    params.set('commodities', htsCode); // 1. Use 'commodities' instead of 'hts_code'
    params.set('history_years', String(historyYears));
    params.set('flow', flow);
    params.set('metric', metric);
    params.set('ytd', String(ytd));

    // 2. Dynamically set granularity
    const is10DigitHts = htsCode.replace(/\./g, '').length === 10;
    if (is10DigitHts && !breakout) {
      params.set('granularity', '10');
    } else if (breakout) {
      params.set('granularity', '6');
    }
    // Otherwise, do not set granularity, let the backend handle it.

    if (breakout) { params.set('breakout', 'true'); if (topN) params.set('topN', String(topN)); }
    if (countryCodes.length > 0) {
      params.set('countries', countryCodes.join(','));
    }
    // For non-breakout we仍??要??????以????Top3，強???? per-country 資??
    // 不強制 breakout，非 breakout 保持原始總額查詢
    if (diagnostic) params.set('diagnostic', '1');
    return `/api/get-trade-report?${params.toString()}`;
  }

  function resolveDataToReport(): string[] {
    const map: Record<string,string> = {
      'cons:quantity': 'CONS_FIR_UNIT_QUANT',
      'cons:value': 'CONS_CUSTOMS_VALUE',
      'cons:cif': 'CONS_COST_INS_FREIGHT',
      'cons:charges': 'CONS_CHARGES_INS_FREIGHT',
      'cons:calc_duties': 'CONS_CALC_DUTY',
      'cons:dutiable': 'CONS_CUSTOMS_VALUE_SUB_DUTY',
      'gen:quantity': 'GEN_FIR_UNIT_QUANTITY',
      'gen:value': 'GEN_CUSTOMS_VALUE',
      'gen:cif': 'GEN_COST_INS_FREIGHT',
      'gen:charges': 'GEN_CHARGES_INS_FREIGHT',
      'gen:calc_duties': 'GEN_CALC_DUTY',
      'gen:dutiable': 'GEN_DUTIABLE_VALUE',
    };
    if (metric === 'landed') {
      const cif = map[`${flow}:cif`];
      const duty = map[`${flow}:calc_duties`];
      return [cif, duty].filter(Boolean);
    }
    const code = map[`${flow}:${metric}`];
    return code ? [code] : ['CONS_FIR_UNIT_QUANT'];
  }

  const diagSummaryText = useMemo(() => {
    try {
      const url = buildFetchUrl();
      const codes = resolveDataToReport();
      return JSON.stringify({ url, dataToReport: codes }, null, 2);
    } catch {
      return JSON.stringify({ url: '', dataToReport: [] }, null, 2);
    }
  }, [htsCode, historyYears, flow, metric, breakout, ytd, countryCodes, diagnostic]);

  const countriesKey = useMemo(() => countryCodes.slice().sort().join(',') || 'ALL', [countryCodes]);

  // Enforce metric set for General Imports (only 4 metrics allowed)
  useEffect(() => {
    if (flow === 'gen') {
      const allowed: Metric[] = ['quantity', 'value', 'cif', 'charges'];
      if (!allowed.includes(metric)) setMetric('quantity');
    }
  }, [flow, metric, setMetric]); // setMetric is a dependency

  const queryKey = useMemo(
    () => [
      'market-trends-chart',
      {
        htsCode,
        flow,
        metric,
        breakout,
        countriesKey,
        ytd,
        historyYears,
        diagnostic,
      },
    ],
    [htsCode, flow, metric, breakout, countriesKey, ytd, historyYears, diagnostic]
  );

  const {
    data: queryData,
    error: queryError,
    isFetching,
    isLoading: isInitialLoading,
    refetch,
  } = useMarketTrendsChartQuery({
    queryKey,
    buildUrl: buildFetchUrl,
    buildSecondaryUrl: () => {
      // secondary: non-breakout totals for year totals
      const params = new URLSearchParams();
      params.set('commodities', htsCode);
      params.set('history_years', String(historyYears));
      params.set('flow', flow);
      params.set('metric', metric);
      params.set('ytd', String(ytd));
      // no breakout to get totals
      const is10DigitHts = htsCode.replace(/\./g, '').length === 10;
      params.set('granularity', is10DigitHts ? '10' : '6');
      if (diagnostic) params.set('diagnostic', '1');
      return `/api/get-trade-report?${params.toString()}`;
    },
    enabled: Boolean(htsCode),
  });

  const rawData = (queryData?.payload as any) ?? null;
  const rawTotals = (queryData?.secondary as any) ?? null;
  const adapterMode = queryData?.adapterMode ?? '';
  const adapterCache = queryData?.adapterCache ?? '';
  const requestId = queryData?.requestId ?? '';
  const lastReportBody = queryData?.lastReportBody ?? '';
  const diagDurationMs = queryData?.diagDurationMs ?? null;
  const error = queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null;
  const isLoading = isFetching || isInitialLoading;

  useEffect(() => {
    if (syncToAdvanced && htsCode && contextHts[0] !== htsCode) {
      setContextHts([htsCode]);
    }
  }, [syncToAdvanced, htsCode, contextHts, setContextHts]);

  const handleRefreshData = () => {
    if (!htsCode) return;
    void refetch();
  };


  const yearsAvailable = useMemo(() => extractYears(rawData), [rawData]);
  const breakoutYearAuto = useMemo(() => breakout ? detectBreakoutYear(rawData) : null, [rawData, breakout]);
  const breakoutYear = useMemo(() => {
    if (!breakout) return null;
    const y = selectedBreakoutYear && yearsAvailable.includes(selectedBreakoutYear)
      ? selectedBreakoutYear
      : (breakoutYearAuto || null);
    return y || null;
  }, [breakout, selectedBreakoutYear, yearsAvailable, breakoutYearAuto]);
  const chartData = useMemo(() => {
    const isValueLike = (m: Metric) => m !== 'quantity';
    const parseSourceBase = selectTableForMode(rawData, ytd) || rawData;
    if ((parseSourceBase as any)?.__landed) {
      try {
        const cifResp = (parseSourceBase as any).cif;
        // Official: Landed Duty?Paid = CIF + Calculated Duties + Import Charges
        const dutyResp = (parseSourceBase as any).duty;       // Calculated Duties
        const chargesResp = (parseSourceBase as any).charges; // Import Charges
        if (!breakout) {
          const years = (cifResp?.dto?.tables?.[0]?.column_groups?.[1]?.columns || []).map((c: any) => String(c.label));
          const rowA = cifResp?.dto?.tables?.[0]?.row_groups?.[0]?.rowsNew?.[0]?.rowEntries || [];
          const rowB = dutyResp?.dto?.tables?.[0]?.row_groups?.[0]?.rowsNew?.[0]?.rowEntries || [];
          const rowC = chargesResp?.dto?.tables?.[0]?.row_groups?.[0]?.rowsNew?.[0]?.rowEntries || [];
          const out = years.map((y: string, i: number) => {
            const a = parseFloat(String(rowA[i+1]?.value ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
            const b = parseFloat(String(rowB[i+1]?.value ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
            const c = parseFloat(String(rowC[i+1]?.value ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
            return { year: y, quantity: a + b + c, unit: 'USD' } as ParsedReportData;
          });
          const currentYear = new Date().getFullYear();
          // Y YTD ?A\?~Y? 0FD YTD hLo~ 0 
          return out.filter((d: ParsedReportData) => ytd ? true : !(d.year === String(currentYear) && d.quantity === 0));
        } else {
          const years = extractYears(cifResp);
          let idx = years.length ? years.length - 1 : 0;
          if (breakoutYear && years.includes(String(breakoutYear))) idx = years.indexOf(String(breakoutYear));
          const collect = (resp: any) => {
            const table = resp?.dto?.tables?.[0];
            const rows = table?.row_groups?.[0]?.rowsNew || [];
            const m = new Map<string, number>();
            for (const r of rows) {
              const e = r?.rowEntries || [];
              const country = String(e?.[0]?.value ?? 'N/A');
              const base = Math.max(0, e.length - years.length);
              const cell = e[base + idx] ?? 0;
              const val = parseFloat(String(cell?.value ?? cell ?? '0').replace(/[^0-9.\-]/g, '')) || 0;
              m.set(country, (m.get(country) || 0) + val);
            }
            return m;
          };
          const m1 = collect(cifResp), m2 = collect(dutyResp), m3 = collect(chargesResp);
          const sum = new Map<string, number>(m1);
          for (const [k, v] of m2.entries()) sum.set(k, (sum.get(k) || 0) + v);
          for (const [k, v] of m3.entries()) sum.set(k, (sum.get(k) || 0) + v);
          const arr = Array.from(sum.entries()).map(([k, v]) => ({ year: k, quantity: v, unit: 'USD' } as ParsedReportData));
          return arr.sort((a,b)=>b.quantity-a.quantity).slice(0, Math.max(1, topN));
        }
      } catch (e) {
        
        return [];
      }
    }
    const ind: 'quantity'|'value' = isValueLike(metric) ? 'value' : 'quantity';
    const parseSource = selectTableForMode(rawData, ytd) || rawData;
    let data = parseReport(parseSource, ind, breakout, topN, breakoutYear || undefined);
    // Fallback for TOTAL-only tables (no per-country rows): parse from totals when not breakout
    try {
      if (!breakout && Array.isArray(data) && data.length === 0) {
        const table = (parseSource as any)?.dto?.tables?.[0];
        const years = extractYears(parseSource);
        const totals: string[] | undefined = table?.total?.values;
        if (Array.isArray(years) && years.length > 0 && Array.isArray(totals) && totals.length >= years.length + 1) {
          const unitLabel = String(table?.column_groups?.[1]?.label || '').toLowerCase();
          const unit = unitLabel.includes('dollar') || unitLabel.includes('value') ? 'USD' : (ind === 'value' ? 'USD' : 'number');
          const out: ParsedReportData[] = years.map((y: string, i: number) => {
            const raw = String(totals[i + 1] ?? '0');
            const val = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
            return { year: y, quantity: val, unit };
          });
          const currentYear = new Date().getFullYear();
          data = out.filter(d => ytd ? true : !(d.year === String(currentYear) && d.quantity === 0));
        }
      }
    } catch {}

    // Extra fallback: if breakout and still no data, try reconstructing Top N from table rows
    try {
      if (breakout && Array.isArray(data) && data.length === 0) {
        const table = (parseSource as any)?.dto?.tables?.[0];
        const years = extractYears(parseSource);
        let idx = years.length ? years.length - 1 : 0;
        if (breakoutYear && years.includes(String(breakoutYear))) idx = years.indexOf(String(breakoutYear));
        const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || table?.rows || [];
        if (Array.isArray(rows) && rows.length) {
          const unitGuess = (v: any) => {
            const s = String(v || '').toLowerCase();
            if (s.includes('usd') || s.includes('dollar') || s.includes('$')) return 'USD';
            return ind === 'value' ? 'USD' : 'number';
          };
          const unit = unitGuess(rows?.[0]?.rowEntries?.[1]?.value);
          const pairs = rows.filter(Boolean).map((r: any) => {
            const e = r?.rowEntries || r?.entries || [];
            const country = String(e?.[0]?.value ?? e?.[0] ?? 'N/A');
            const base = Math.max(0, e.length - years.length);
            const cell = e[base + idx] ?? 0;
            const raw = (cell?.value ?? cell ?? '0').toString();
            const value = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
            return { country, value };
          });
          const sorted = pairs.sort((a: {value: number}, b: {value: number}) => b.value - a.value).slice(0, Math.max(1, topN));
          data = sorted.map((p: {country: string, value: number}) => ({ year: p.country, quantity: p.value, unit }));
        }
      }
    } catch {}

    // Extra fallback: if non-breakout and still no data, try parsing first data row entries
    try {
      if (!breakout && Array.isArray(data) && data.length === 0) {
        const table = (parseSource as any)?.dto?.tables?.[0];
        const years = extractYears(parseSource);
        const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || table?.rows || [];
        if (Array.isArray(rows) && rows.length) {
          const first = rows[0];
          const entries = first?.rowEntries || first?.entries || [];
          const unit = String(entries?.[1]?.value || (ind === 'value' ? 'USD' : 'number'));
          const baseIndex = Math.max(0, entries.length - years.length);
          const out: ParsedReportData[] = years.map((y: string, i: number) => {
            const cell = entries[baseIndex + i] ?? 0;
            const raw = (cell?.value ?? cell ?? '0').toString();
            const value = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
            return { year: y, quantity: value, unit };
          });
          const currentYear = new Date().getFullYear();
          data = out.filter((d: ParsedReportData) => ytd ? true : !(d.year === String(currentYear) && d.quantity === 0));
        }
      }
    } catch {}
    // Fallback: Y? Break Out ?e{~??C]year=YYYY^A?l?sa Top N
    try {
      if (breakout && Array.isArray(data) && data.length > 0 && /^\d{4}$/.test(String(data[0].year || ''))) {
        const table = (rawData as any)?.dto?.tables?.[0];
        const years = extractYears(rawData);
        let idx = years.length ? years.length - 1 : 0;
        if (breakoutYear && years.includes(String(breakoutYear))) idx = years.indexOf(String(breakoutYear));
        const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || [];
        const unit = String(rows?.[0]?.rowEntries?.[1]?.value || (isValueLike(metric) ? 'USD' : 'number'));
        const pairs = rows.filter(Boolean).map((r: any) => {
          const entries = r?.rowEntries || [];
          const country = String(entries?.[0]?.value ?? 'N/A');
          const baseIndex = Math.max(0, entries.length - years.length);
          const cell = entries[baseIndex + idx] ?? 0;
          const raw = (cell?.value ?? cell ?? '0').toString();
          const value = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
          return { country, value };
        });
        const sorted = pairs.sort((a: {value: number}, b: {value: number}) => b.value - a.value).slice(0, Math.max(1, topN));
        data = sorted.map((p: {country: string, value: number}) => ({ year: p.country, quantity: p.value, unit }));
      }
    } catch {}
    return data;
  }, [rawData, metric, breakout, topN, breakoutYear]);

  const totalsByYear = useMemo(() => {
    try {
      const source = selectTableForMode(rawTotals, ytd) || rawTotals;
      const table = (source as any)?.dto?.tables?.[0];
      const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || [];
      const years = extractYears(source);
      if (!Array.isArray(rows) || !rows.length || !years.length) return {};
      const entries = rows[0]?.rowEntries || rows[0]?.entries || [];
      const baseIndex = Math.max(0, entries.length - years.length);
      const map: Record<string, number> = {};
      years.forEach((y: string, i: number) => {
        const cell = entries[baseIndex + i] ?? 0;
        const raw = (cell?.value ?? cell ?? '0').toString();
        map[y] = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
      });
      return map;
    } catch {
      return {};
    }
  }, [rawTotals, ytd]);

  // Stacked values per year (non-breakout): default top3 per year; if user selected countries, use those
  const stacked = useMemo(() => {
    if (breakout) return { data: [] as any[], series: [...DISPLAY_SERIES], stackOrder: [...BAR_STACK_ORDER] };
    try {
      const source = selectTableForMode(rawData, ytd) || rawData;
      const table = (source as any)?.dto?.tables?.[0];
      const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || [];
      const years = extractYears(rawData);
      if (!Array.isArray(rows) || !rows.length || !years.length) return { data: [], series: [...DISPLAY_SERIES], stackOrder: [...BAR_STACK_ORDER] };
      const nameMap = new Map<string, string>();
      countries.forEach((o) => {
        const base = String(o.name || '').split(' - ')[0];
        nameMap.set(o.value, base);
      });
      const selectedCountries = (countryCodes || []).map(c => nameMap.get(c) || c).filter(Boolean);
      const data: any[] = [];
      let unit = '';
      years.forEach((year: string, idx: number) => {
        const entries: Array<[string, number]> = [];
        for (const r of rows) {
          const e = r?.rowEntries || r?.entries || [];
          const country = String(e?.[0]?.value ?? 'N/A');
          if (!unit && e?.[1]) unit = String(e[1]?.value || '');
          const base = Math.max(0, e.length - years.length);
          const cell = e[base + idx] ?? 0;
          const raw = (cell?.value ?? cell ?? '0').toString();
          const val = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
          entries.push([country, val]);
        }
        const totalVal = totalsByYear[year] || entries.reduce((s, [, v]) => s + v, 0);
        if (totalVal <= 0) return;
        let topEntries: Array<[string, number]> = [];
        let totalForYear = totalVal;
        if (selectedCountries.length > 0) {
          const selectedEntries = selectedCountries.map(c => {
            const hit = entries.find(([name]) => name === c || name.split(' - ')[0] === c);
            return [c, hit ? hit[1] : 0] as [string, number];
          });
          totalForYear = selectedEntries.reduce((s, [, v]) => s + v, 0);
          topEntries = [...selectedEntries].sort((a, b) => b[1] - a[1]).slice(0, 3);
          const selSum = topEntries.reduce((s, [, v]) => s + v, 0);
          if (selSum === 0) {
            topEntries = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
            totalForYear = topEntries.reduce((s, [, v]) => s + v, 0);
          }
        } else {
          topEntries = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
        }
        const othersVal = Math.max(0, totalForYear - topEntries.reduce((s, [, v]) => s + v, 0));
        const row: any = { year, unit };
        // ????欄?? Top1/Top2/Top3/Others
        const names = topEntries.map(([n]) => n);
        row.Top1 = topEntries[0]?.[1] ?? 0;
        row.Top1_name = topEntries[0]?.[0] ?? 'N/A';
        row.Top2 = topEntries[1]?.[1] ?? 0;
        row.Top2_name = topEntries[1]?.[0] ?? 'N/A';
        row.Top3 = topEntries[2]?.[1] ?? 0;
        row.Top3_name = topEntries[2]?.[0] ?? 'N/A';
        row.Others = othersVal;
        row.total = totalForYear;
        data.push(row);
      });
      return { data, series: [...DISPLAY_SERIES], stackOrder: [...BAR_STACK_ORDER] };
    } catch {
      return { data: [], series: [...DISPLAY_SERIES], stackOrder: [...BAR_STACK_ORDER] };
    }
  }, [rawData, totalsByYear, countryCodes, countries, breakout]);

  // Breakout multi-year country series
  const breakoutSeries = useMemo(() => {
    if (!breakout) return null;
    try {
      const source = selectTableForMode(rawData, ytd) || rawData;
      const table = (source as any)?.dto?.tables?.[0];
      const rows = table?.row_groups?.[0]?.rowsNew || table?.row_groups?.[0]?.rows || [];
      const years = extractYears(source);
      if (!Array.isArray(rows) || !rows.length || !years.length) return null;
      const countriesList = rows.map((r: any) => String(r?.rowEntries?.[0]?.value ?? r?.entries?.[0]?.value ?? 'N/A'));
      const valuesByYear: Record<string, Record<string, number>> = {};
      years.forEach((y: string, idx: number) => {
        valuesByYear[y] = {};
        for (const r of rows) {
          const e = r?.rowEntries || r?.entries || [];
          const country = String(e?.[0]?.value ?? 'N/A');
          const base = Math.max(0, e.length - years.length);
          const cell = e[base + idx] ?? 0;
          const raw = (cell?.value ?? cell ?? '0').toString();
          valuesByYear[y][country] = parseFloat(raw.replace(/[^0-9.\-]/g, '')) || 0;
        }
      });
      return { years, countries: countriesList, valuesByYear };
    } catch {
      return null;
    }
  }, [rawData, breakout, ytd]);

  useEffect(() => {
    if (breakout && breakoutSeries?.years?.length) {
      // default last 5 years
      const yrs = breakoutSeries.years.slice(-5);
      setSelectedYearsBreakout(yrs);
    }
  }, [breakout, breakoutSeries]);

  const allowedCountriesBreakout = useMemo(() => {
    if (!breakoutSeries) return [];
    const yrs = selectedYearsBreakout.length ? selectedYearsBreakout : breakoutSeries.years;
    const sums: Array<{ name: string; total: number }> = [];
    for (const c of breakoutSeries.countries || []) {
      let total = 0;
      for (const y of yrs) {
        total += breakoutSeries.valuesByYear?.[y]?.[c] ?? 0;
      }
      sums.push({ name: c, total });
    }
    const sorted = sums.sort((a, b) => b.total - a.total);
    const picked = sorted.filter(s => s.total > 0).slice(0, Math.max(1, topN || 5));
    if (picked.length === 0) return sorted.slice(0, Math.max(1, topN || 5)).map(s => s.name);
    return picked.map(s => s.name);
  }, [breakoutSeries, selectedYearsBreakout, topN]);

  const nonBreakoutTotals = useMemo(() => {
    return Object.entries(totalsByYear || {}).map(([y, v]) => ({
      year: y,
      quantity: v as number,
      unit: metric === 'value' ? 'USD' : 'number'
    })).sort((a, b) => parseInt(String(a.year)) - parseInt(String(b.year)));
  }, [totalsByYear, metric]);

  const tableRows = useMemo(() => {
    if (breakout) return [];
    if (stacked.data.length > 0) {
      return stacked.data.map((row: any) => {
        const total = row.total ?? null;
        const fields = ['Top1','Top2','Top3','Others'] as const;
        const entries = fields.map((f) => {
          const v = Number(row[f] || 0);
          const pct = total && total > 0 ? (v / total) * 100 : null;
          const name = row[`${f}_name`] || f;
          return { key: f, name, value: v, pct };
        });
        return { year: row.year, total, entries };
      });
    }
    // fallback: only totals (no per-country rows)
    if (chartData.length > 0) {
      return chartData.map((row: ParsedReportData) => ({
        year: row.year,
        total: row.quantity,
        entries: [
          { key: 'Top1', name: 'Total', value: row.quantity, pct: 100 },
          { key: 'Top2', name: 'N/A', value: 0, pct: 0 },
          { key: 'Top3', name: 'N/A', value: 0, pct: 0 },
          { key: 'Others', name: 'Others', value: 0, pct: 0 },
        ],
      }));
    }
    if (nonBreakoutTotals.length > 0) {
      return nonBreakoutTotals.map((row: any) => ({
        year: row.year,
        total: row.quantity,
        entries: [
          { key: 'Top1', name: 'Total', value: row.quantity, pct: 100 },
          { key: 'Top2', name: 'N/A', value: 0, pct: 0 },
          { key: 'Top3', name: 'N/A', value: 0, pct: 0 },
          { key: 'Others', name: 'Others', value: 0, pct: 0 },
        ],
      }));
    }
    return [];
  }, [stacked, breakout, chartData, nonBreakoutTotals]);


  // Load countries cache on mount and preselect from AD/CVD names if provided

  useEffect(() => {

    (async () => {

      const opts = await loadCountriesCached();

      setCountries(opts);

      if (countryCodes.length === 0 && defaultAdcvdCountries.length > 0) {

        const codes = mapCountryNamesToCodes(defaultAdcvdCountries, opts); // This logic seems to be duplicated, might need review

        if (codes.length) {

          setCountryCodes(codes);

          setUseAllCountries(false);

        }

      }

    })();

  }, [syncToAdvanced, htsCode, contextHts]); // Reverted to original, as the logic inside handles the initial state



  async function handleRefreshCountries() {

    try {

      setIsRefreshingCountries(true);

      const opts = await refreshCountries();

      setCountries(opts);

      if (countryCodes.length === 0 && defaultAdcvdCountries.length) {

        const codes = mapCountryNamesToCodes(defaultAdcvdCountries, opts);

        if (codes.length) {

          setCountryCodes(codes);

          setUseAllCountries(false);

        }

      }

    } catch (e) {

      

    } finally {

      setIsRefreshingCountries(false);

    }

  }



  function exportCsv() {
    if (!chartData.length) return;
    const firstCol = breakout ? 'Country' : 'Year';
    const metricLabel = (
  metric==='quantity' ? 'Import Quantity' :
  metric==='value' ? 'Customs Value' :
  metric==='cif' ? 'CIF Value' :
  metric==='charges' ? 'Import Charges' :
  metric==='calc_duties' ? 'Calculated Duties' :
  metric==='dutiable' ? 'Dutiable Value' :
  'Landed Duty-Paid Value'
);
    const rows = [
      [firstCol, `${metricLabel} (${chartData[0]?.unit || ''})${breakout && breakoutYear ? ` - ${breakoutYear}` : ''}`],
      ...chartData.map((r: ParsedReportData) => [r.year, String(r.quantity)])
    ];
    const csv = rows.filter(Boolean).map((r: (string | number)[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market_trends_${cleanHtsToSix(htsCode)}_${flow}_${metric}${breakout?`_bo${breakoutYear||'auto'}`:''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  function buildTitle(): string {
    const flowLabel = flow === 'gen' ? 'General Imports' : 'Imports for Consumption';
    const metricLabel = (
      metric === 'quantity' ? 'First Unit of Quantity' :
      metric === 'value' ? 'Customs Value' :
      metric === 'cif' ? 'CIF Value' :
      metric === 'charges' ? 'Import Charges' :
      metric === 'calc_duties' ? 'Calculated Duties' :
      metric === 'dutiable' ? 'Dutiable Value' :
  'Landed Duty-Paid Value'
    );
    return `Market Trends - ${flowLabel} - ${metricLabel}`;
  }

  function exportRunReportJson() {
    // Build a known-good payload based on current view

    const is10DigitHts = htsCode.replace(/\./g, '').length === 10;
    const isBreakoutOrCompare = breakout; // In quick mode, breakout is the only relevant flag for this logic

    let finalAggregation: string;
    let finalCommodities: string[];
    let finalGranularity: string;

    if (is10DigitHts && !isBreakoutOrCompare) { // flow is always 'cons' or 'gen' in quick mode
        finalAggregation = 'Display Commodities Separately';
        finalCommodities = [htsCode.replace(/\./g, '').substring(0, 10)]; // Keep full 10-digit
        finalGranularity = '10';
    } else {
        // All other conditions (6-digit HTS, or breakout/compare)
        finalAggregation = 'Aggregate Commodities';
        finalCommodities = [cleanHtsToSix(htsCode)]; // Use 6-digit
        finalGranularity = '6';
    }

    const derivedYears = lastNYearsFromData(chartData.map((d: ParsedReportData) => d.year), 5);

    const years = derivedYears.length ? derivedYears : Array.from({length:5}, (_,i)=>String(new Date().getFullYear()-4+i));

    const payload = {

      savedQueryName: '',

      savedQueryDesc: buildTitle(),
      isOwner: true,

      runMonthly: false,

      reportOptions: { tradeType: (flow==='gen'?'GenImp':'Import'), classificationSystem: 'HTS' },
      searchOptions: {

        MiscGroup: {

          districts: { districtsSelectType: 'all' },

          importPrograms: { programsSelectType: 'all' },

          extImportPrograms: { programsSelectType: 'all' },

          provisionCodes: { provisionCodesSelectType: 'all' }

        },

        commodities: {

          aggregation: finalAggregation,

          codeDisplayFormat: 'YES',

          commodities: finalCommodities,

          commoditiesExpanded: [],

          commoditiesManual: '',

          commodityGroups: { systemGroups: [], userGroups: [] },

          commoditySelectType: 'list',

          granularity: finalGranularity,

          groupGranularity: null,

          searchGranularity: null

        },

        componentSettings: {
          dataToReport: resolveDataToReport(),
          scale: '1',
          timeframeSelectType: 'fullYears',

          years,

          startDate: null,

          endDate: null,

          startMonth: null,

          endMonth: null,

          yearsTimeline: 'Annual'

        },

        countries: (countryCodes.length > 0) ? {

          aggregation: 'Aggregate Countries',

          countries: countryCodes,

          countriesExpanded: countryCodes.map((code) => {

            const opt = countries.find(o => o.value === code);

            return { name: opt?.name || code, value: code };

          }),

          countriesSelectType: 'list',

          countryGroups: { systemGroups: [], userGroups: [] }

        } : {

          aggregation: 'Aggregate Countries',

          countries: [],

          countriesExpanded: [{ name: 'All Countries', value: 'all' }],

          countriesSelectType: 'all',

          countryGroups: { systemGroups: [], userGroups: [] }

        }

      },

      sortingAndDataFormat: {

        DataSort: { columnOrder: [], fullColumnOrder: [], sortOrder: [] },

        reportCustomizations: { exportCombineTables: false, showAllSubtotal: true, totalRecords: '20000', exportRawData: (metric !== 'quantity') }
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `runreport_${finalCommodities[0] || 'unknown'}.json`;

    a.click();

    URL.revokeObjectURL(url);

  }



  const renderTable = () => {
    if (breakout && breakoutSeries) {
      const yrs = selectedYearsBreakout;
      const countries = allowedCountriesBreakout;
      return (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Year</th>
                {countries.map((c) => (
                  <th key={c} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border text-sm text-card-foreground">
              {yrs.map((y) => (
                <tr key={y}>
                  <td className="px-4 py-2 whitespace-nowrap">{y}</td>
                  {countries.map((c) => {
                    const v = breakoutSeries.valuesByYear?.[y]?.[c] ?? 0;
                    return <td key={c} className="px-4 py-2 whitespace-nowrap">{v.toLocaleString()}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // non-breakout: show totals + Top1/Top2/Top3/Others (value and %)
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Year</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
              {['Top1','Top2','Top3','Others'].map((s) => (
                <th key={s} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border text-sm text-card-foreground">
            {tableRows.map((r: any) => (
              <tr key={r.year}>
                <td className="px-4 py-2 whitespace-nowrap">{r.year}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.total !== null ? r.total.toLocaleString() : '-'}</td>
                {['Top1','Top2','Top3','Others'].map((s) => {
                  const entry = r.entries.find((e: any) => e.key === s);
                  if (!entry) return <td key={s} className="px-4 py-2 whitespace-nowrap">-</td>;
                  const pctText = entry.pct !== null ? ` (${entry.pct.toFixed(1)}%)` : '';
                  const nameText = entry.name ? `${entry.name} ` : '';
                  return <td key={s} className="px-4 py-2 whitespace-nowrap">{nameText}{entry.value.toLocaleString()} {pctText}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (

    <TooltipProvider>
      <Card className="rounded-2xl shadow-md w-full">

        <CardHeader>
          <CardTitle>{buildTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pb-6">
  
          {/* Controls: Country dropdown + actions */}
  
          <div className="mb-3 flex flex-wrap items-center gap-2">
  
            <div className="relative flex items-center gap-2">
              <CountrySelector 
                countryCodes={countryCodes}
                setCountryCodes={setCountryCodes}
              />
              <Button size="sm" variant="glass" onClick={handleRefreshCountries} disabled={isRefreshingCountries}>
                {isRefreshingCountries ? 'Refreshing...' : 'Load Countries'}
              </Button>
              <Button size="sm" onClick={handleRefreshData} disabled={!htsCode}>
                {isFetching ? 'Refreshing…' : 'Refresh Data'}
              </Button>

            </div>
  
            {(countryCodes.length > 0) && (
              <div className="flex flex-wrap items-center gap-1">
                {countryCodes.map(code => {
                  const opt = countries.find(o => o.value === code);
                  const label = opt?.name || code;
                  return (
                    <span key={code} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {label}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground" aria-label="Remove country" onClick={() => {
                            const next = countryCodes.filter(c => c !== code);
                            setCountryCodes(next);
                          }}>&#x2715;</button>
                        </TooltipTrigger>
                        <TooltipContent><p>Remove</p></TooltipContent>
                      </Tooltip>
                    </span>
                  );
                })}
              </div>
            )}          
            <div className="w-full flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                <Label>Flow</Label>
                <ToggleGroup type="single" value={flow} onValueChange={(v: string) => v && setFlow(v as Flow)} size="sm">
                  <ToggleGroupItem value="cons">For Consumption</ToggleGroupItem>
                  <ToggleGroupItem value="gen">General Imports</ToggleGroupItem>
                </ToggleGroup>
              </div>

                <div className="flex flex-wrap items-center gap-2">
                <Label>Metric</Label>
                <ToggleGroup type="single" value={metric} onValueChange={(v: string) => v && setMetric(v as Metric)} size="sm" className="flex-wrap">
                  <ToggleGroupItem value="quantity">Quantity</ToggleGroupItem>
                  <ToggleGroupItem value="value">Customs Value</ToggleGroupItem>
                  <ToggleGroupItem value="cif">CIF Value</ToggleGroupItem>
                  <ToggleGroupItem value="charges">Import Charges</ToggleGroupItem>
                  {flow === 'cons' && (
                    <>
                      <ToggleGroupItem value="calc_duties">Calc Duties</ToggleGroupItem>
                      <ToggleGroupItem value="dutiable">Dutiable</ToggleGroupItem>
                      <ToggleGroupItem value="landed">Landed</ToggleGroupItem>
                    </>
                  )}
                </ToggleGroup>
              </div>
  
                <div className="flex items-center gap-2">
                <Label>Period</Label>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox id="ytd" checked={ytd} onCheckedChange={(checked: boolean) => setPeriod({ ...period, ytd: Boolean(checked) })} />
                  <Label htmlFor="ytd" className="text-sm">YTD</Label>
                  <Slider
                    value={[historyYears]}
                    onValueChange={(v: number[]) => setPeriod({ ...period, years: v[0] })}
                    min={1}
                    max={20}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-sm text-foreground">{historyYears}y</span>
                </div>
              </div>
                <div className="flex items-center gap-2">
                <Label>Break Out</Label>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox id="breakout" checked={breakout} onCheckedChange={(checked: boolean) => setBreakoutState({ ...breakoutState, enabled: Boolean(checked) })} />
                  <Label htmlFor="breakout" className="text-sm">Top N</Label>
                  <Input
                    type="number"
                    value={topN}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBreakoutState({ ...breakoutState, topN: Math.max(1, Math.min(20, parseInt(e.target.value || '5', 10))) })}
                    className="w-16 h-8"
                    disabled={!breakout}
                  />
                  <Label htmlFor="breakout-year" className="text-sm">Year</Label>
                  <Select
                    value={selectedBreakoutYear || 'auto'}
                    onValueChange={(v: string) => {
                      const year = v === 'auto' ? null : v;
                      setBreakoutState({ ...breakoutState, year });
                    }}
                    disabled={!breakout}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {yearsAvailable.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
  
              <Button size="sm" variant="glass" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" variant="glass" onClick={exportRunReportJson}>Export JSON ({metric})</Button>
              <div className="flex items-center space-x-2 ml-2">
                <Checkbox id="diagnostic-mode" checked={diagnostic} onCheckedChange={(checked: boolean) => setDiagnostic(Boolean(checked))} />
                <Label htmlFor="diagnostic-mode" className="text-xs font-normal">Diagnostic</Label>
              </div>            
              {(adapterMode || adapterCache) && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{adapterMode}{adapterCache?` P ${adapterCache}`:''}</span>
              )}
            <div className="flex items-center gap-2 ml-2">
              <Label htmlFor="sync-adv" className="text-xs font-normal">Sync</Label>
              <Switch id="sync-adv" checked={syncToAdvanced} onCheckedChange={(checked: boolean) => setSyncToAdvanced(Boolean(checked))} />
            </div>
            <Popover>
              <PopoverTrigger asChild> 
                <Button size="sm" variant="ghost">Info</Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-xl">
                <div className="text-xs text-muted-foreground space-y-3">
                  <div>
                    <div className="font-semibold mb-1">Trade Flow wq</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><b>Imports: For Consumption (@if)</b>??口:</li>
                      <li><b>Imports: General (@if)</b>: t?iffA???O_iJO`A]A?sBfBO|C</li>
                      <li className="text-muted-foreground"><b>Exports (Xf)</b>: ]t?XfΥ~XfXp??C]i?W^</li>
                      <li className="text-muted-foreground"><b>Trade Balance (TlB)</b>: Xf`Bhif`BA?tAt?ftC]i?W^</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">BP?q</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><b>First Unit of Quantity (n?pq)</b>: ??~Ww??pAiO??BB褽?C</li>
                      {flow === 'gen' && <>
                        <li><b>General Customs Value (@)</b>: iffXff?At?BOOCΨ?p|???C</li>
                        <li><b>General CIF Imports Value (@if)</b>: fF?@f?u??vA]t?[W?BOOC</li>
                        <li><b>General Import Charges (@ifO/O)</b>: ?if|OA]A|BO@?I]201B232B301^BSO|C?w?At??PΤ??K|C</li>
                      </>}
                      {flow === 'cons' && <>
                        <li><b>Customs Value (@)</b>: iffXff?At?BOOC</li>
                        <li><b>CIF Imports Value (@if)</b>: fF?@f?u??vA]t?[W?BOOC</li>
                        <li><b>Import Charges (ifO/O)</b>: ?if|OA]A|BO@?I]201B232B301^BSO|C?w?At??PΤ??K|C</li>
                        <li><b>Calculated Duties (w|/p|B)</b>: ?HTS|h?SifpXz?if|BC????AN??|BA]t AD/CVD |OC</li>
                        <li><b>Dutiable Value (i?|)</b>: ?p??u|f`?C]SwK|?~p??C</li>
                        <li><b>Landed Duty-Paid Value</b>: fwMAiJ?yq?CG
                          <code>CIF Value + Calculated Duties</code>  <code>CIF Value + Import Charges + Calculated Duties</code>C
                          ?`NGx DataWeb uLandedv <i>CIF + Import Charges + Duties</i>AP@T|p` <i>CIF + Duties</i>F??ν?????Pf|A]t AD/CVDC
                        </li>
                      </>
                      }
                    </ul>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          </div>
  
          <div className="mb-4" style={{ minHeight: 380 }}>
  
            {isLoading && (
            <div className="pt-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          )}
  
            {error && <div className="text-center text-destructive pt-4">Error: {error}</div>}
  
            {!isLoading && !error && chartData.length === 0 && stacked.data.length === 0 && (
              <EmptyState
                icon={<BarChart3 className="h-10 w-10" />}
                title="No Trade Statistics Available"
                description="No data was found for the selected criteria. Try adjusting the period or country selection."
                className="mt-4"
              />
            )}

            {!isLoading && !error && !breakout && stacked.data.length > 0 && (

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={stacked.data}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="year" fontSize={12} />

                  <YAxis fontSize={12} tickFormatter={(value: any) => value.toLocaleString()} />

                  <RechartsTooltip formatter={(value: number, name: string, props: any) => [`${(value as number).toLocaleString()} ${props.payload.unit || ''}`, name]} />

                  <Legend />

                  {(stacked.stackOrder || DISPLAY_SERIES).map((s, i) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      stackId="a"
                      name={s === 'Others' ? 'Others' : (stacked.data[0]?.[`${s}_name`] || s)}
                      fill={colorVar(i + 1)}
                    />
                  ))}
                </BarChart>

              </ResponsiveContainer>

            )}

            {!isLoading && !error && !breakout && stacked.data.length === 0 && (chartData.length > 0 || nonBreakoutTotals.length > 0) && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(chartData.length ? chartData : nonBreakoutTotals)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value: any) => value.toLocaleString()} />
                  <RechartsTooltip formatter={(value: number, name: string, props: any) => [`${(value as number).toLocaleString()} ${props.payload.unit || ''}`, name]} />
                  <Legend />
                  <Bar dataKey="quantity" name={`${metric==='quantity'?'Import Quantity': metric==='value'?'Customs Value (USD)': metric==='cif'?'CIF Value (USD)': metric==='charges'?'Import Charges (USD)': metric==='calc_duties'?'Calculated Duties (USD)': metric==='dutiable'?'Dutiable Value (USD)':'Landed Duty-Paid Value (USD)'}`} fill={colorVar(1)} />
                </BarChart>
              </ResponsiveContainer>
            )}
  
            {!isLoading && !error && breakout && breakoutSeries && selectedYearsBreakout.length > 0 && (
              <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {breakoutSeries.years.map((y) => (
                    <Button
                      key={y}
                      size="sm"
                      variant={selectedYearsBreakout.includes(y) ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedYearsBreakout((prev) =>
                          prev.includes(y) ? prev.filter((yr) => yr !== y) : [...prev, y]
                        );
                      }}
                    >
                      {y}
                    </Button>
                  ))}
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={breakoutSeries.years.map((y) => {
                        const row: any = { year: y };
                        allowedCountriesBreakout.forEach((c) => {
                          row[c] = breakoutSeries.valuesByYear?.[y]?.[c] ?? 0;
                        });
                        return row;
                      }).filter((row: any) => selectedYearsBreakout.includes(String(row.year)))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(value: any) => value.toLocaleString()} />
                      <RechartsTooltip content={<BreakoutTooltipContent />} />
                      <Legend />
                      {allowedCountriesBreakout.map((c, i) => (
                        <Bar key={`bar-${c}`} dataKey={c} name={c} fill={colorVar(i + 1)} />
                      ))}
                      {allowedCountriesBreakout.map((c, i) => (
                        <Line key={`line-${c}`} type="monotone" dataKey={c} stroke={colorVar(i + 1)} dot={false} />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
  
            <div className="mt-4 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowTable(!showTable)} disabled={isLoading || !!error || (!breakout && chartData.length === 0) || (breakout && (!breakoutSeries || allowedCountriesBreakout.length === 0))}>
                {showTable ? 'Hide Data' : 'Show Data'}
              </Button>
            </div>

          {showTable && !isLoading && !error && ((breakout && breakoutSeries && allowedCountriesBreakout.length > 0) || (!breakout && chartData.length > 0)) && renderTable()}
  
          {diagnostic && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Diagnostics</div>
              <div className="flex items-center gap-3">
                {(adapterMode || adapterCache) && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{adapterMode}{adapterCache?` ??${adapterCache}`:''}</span>
                )}
                {diagDurationMs != null && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border">{`${Math.round(diagDurationMs)} ms`}</span>
                )}
                <button
                  className="text-xs text-muted-foreground underline"
                  onClick={() => { try { navigator.clipboard.writeText(diagSummaryText); } catch {} }}
                  title="Copy Summary"
                >Copy Summary</button> 
                <button className="text-xs text-muted-foreground underline" onClick={() => setDiagPanelOpen((v: boolean) => !v)}>
                  {diagPanelOpen ? 'CLOSE' : 'OPEN'}
                </button>
              </div>
            </div>
            {diagPanelOpen && (
              <div className="space-y-3 mt-2">
                <div>
                  <div className="text-xs font-semibold text-foreground">Request Summary</div>
                  <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-[12px]">{diagSummaryText}</pre>
                </div>
                {(adapterMode || adapterCache || requestId) && (
                  <div>
                    <div className="text-xs font-semibold text-foreground">Headers</div>
                    <pre className="bg-muted p-3 rounded max-h-96 overflow-auto text-[12px]">{JSON.stringify({ 'X-Adapter-Mode': adapterMode, 'X-Cache': adapterCache, 'X-Request-ID': requestId }, null, 2)}</pre>
                  </div>
                )}
                {lastReportBody && (
                  <div>
                    <div className="text-xs font-semibold text-foreground">reportBody</div>
                    <pre className="text-[12px] whitespace-pre-wrap break-all bg-muted border rounded p-3 max-h-80 overflow-auto">{lastReportBody}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
  
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border p-2 rounded shadow-lg text-sm">
        <p className="label">{`${label}`}</p>
        <p className="intro">{`${payload[0].name} : ${(payload[0].value as number).toLocaleString()} ${data.unit}`}</p>
      </div>
    );
  }

  return null;
};
