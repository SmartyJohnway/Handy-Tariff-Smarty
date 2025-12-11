import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { Label } from "../components/ui/label";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Switch } from "../components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { CollapsibleJson } from "../components/ui/CollapsibleJson";
import { Calendar } from "../components/ui/calendar";
import PublicInspectionInfoCard from "../components/fr/PublicInspectionInfoCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { usePublicInspectionQuery, type PublicInspectionResponse } from '@/hooks/queries/usePublicInspectionQuery';
import { usePublicInspectionCurrentQuery } from '@/hooks/queries/usePublicInspectionCurrentQuery';
import { usePublicInspectionSearchDetailsMutation } from '@/hooks/mutations/usePublicInspectionSearchDetailsMutation';
import { usePublicInspectionTimelineQuery } from '@/hooks/queries/usePublicInspectionTimelineQuery';

import { DocumentDetails } from '@/components/fr/DocumentDetails';

import type { NormalizedFRDoc } from '@/lib/frNormalize';

import { fetchNormalizedFrDoc } from '@/lib/frDocDetail';

type PiDoc = {
  document_number: string;
  title: string;
  filing_type?: string; // "Special" | "Regular"
  agencies?: Array<{ name?: string; slug?: string }>;
  pdf_url?: string;
  num_pages?: number;
  pdf_file_size?: number;
  filed_at?: string; // datetime
  publication_date?: string; // date
  html_url?: string;
};

function toYMDLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysDate(date: Date, delta: number): Date {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + delta);
  return dt;
}

export default function PublicInspection() {
  // 選定的 Date 物件，代表 UTC
  const [selected, setSelected] = React.useState<Date>(new Date());
  const date = React.useMemo(() => toYMDLocal(selected), [selected]);
  const [debugMode, setDebugMode] = React.useState<boolean>(false);
  const DEFAULT_BASE_URI = 'https://www.federalregister.gov/api/v1';
  const [baseUri, setBaseUri] = React.useState<string>(DEFAULT_BASE_URI);

  const [error, setError] = React.useState<string | null>(null);
  const [docs, setDocs] = React.useState<PiDoc[]>([]);
  const [raw, setRaw] = React.useState<any | null>(null);
  const [searchDetails, setSearchDetails] = React.useState<any | null>(null);
  const [specialUpdatedAt, setSpecialUpdatedAt] = React.useState<string | null>(null);
  const [regularUpdatedAt, setRegularUpdatedAt] = React.useState<string | null>(null);
  const [timelineData, setTimelineData] = React.useState<any | null>(null);
  const [timelineStart, setTimelineStart] = React.useState<string>('');
  const [timelineEnd, setTimelineEnd] = React.useState<string>('');
  const [timelineAutoRange, setTimelineAutoRange] = React.useState(true);
  const [noDataSet, setNoDataSet] = React.useState<Set<string>>(new Set());
  const [manual, setManual] = React.useState<string>("");
  const [inputDateStr, setInputDateStr] = React.useState<string>("");
  const didBootRef = React.useRef<boolean>(false);
  const queryClient = useQueryClient();
  const [expandedDoc, setExpandedDoc] = React.useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = React.useState<NormalizedFRDoc | null>(null);
  const [expandedRaw, setExpandedRaw] = React.useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = React.useState(false);
  const [expandedError, setExpandedError] = React.useState<string | null>(null);

  const piQuery = usePublicInspectionQuery({ date, debugMode, baseUri });
  const loading = piQuery.isLoading || piQuery.isFetching;
  const [shouldFetchCurrent, setShouldFetchCurrent] = React.useState(true);
  const currentQuery = usePublicInspectionCurrentQuery({ debugMode, baseUri, enabled: shouldFetchCurrent });
  const searchDetailsMutation = usePublicInspectionSearchDetailsMutation();
  const timelineEnabled = React.useMemo(() => {
    if (!timelineStart || !timelineEnd) return false;
    return timelineStart <= timelineEnd;
  }, [timelineStart, timelineEnd]);

  const timelineQuery = usePublicInspectionTimelineQuery({
    debugMode,
    baseUri,
    startDate: timelineStart,
    endDate: timelineEnd,
    enabled: timelineEnabled,
  });

  const loadDocumentDetails = React.useCallback(
    async (docnum: string) => {
      const normalized = (docnum || '').trim();
      if (!normalized) return;
      if (expandedDoc === normalized) {
        setExpandedDoc(null);
        setExpandedDetail(null);
        setExpandedRaw(null);
        setExpandedError(null);
        return;
      }
      setExpandedDoc(normalized);
      setExpandedDetail(null);
      setExpandedRaw(null);
      setExpandedError(null);
      setExpandedLoading(true);
      try {
        const result = await fetchNormalizedFrDoc(queryClient, normalized, {
          baseUri: debugMode ? baseUri : undefined,
        });
        if (!result.normalized) {
          setExpandedDetail(null);
          setExpandedError('找不到文件詳情');
        } else {
          setExpandedDetail(result.normalized);
          setExpandedError(null);
        }
        setExpandedRaw(result.raw);
      } catch (err: any) {
        setExpandedDetail(null);
        setExpandedRaw(null);
        setExpandedError(err instanceof Error ? err.message : String(err));
      } finally {
        setExpandedLoading(false);
      }
    },
    [expandedDoc, queryClient, debugMode, baseUri],
  );

  const syncTimelineRange = React.useCallback(() => {
    const start = toYMDLocal(addDaysDate(selected, -3));
    const end = toYMDLocal(addDaysDate(selected, 3));
    setTimelineStart(start);
    setTimelineEnd(end);
  }, [selected]);

  React.useEffect(() => {
    if (timelineStart || timelineEnd) return;
    syncTimelineRange();
  }, [timelineStart, timelineEnd, syncTimelineRange]);

  React.useEffect(() => {
    if (!timelineAutoRange) return;
    syncTimelineRange();
  }, [timelineAutoRange, syncTimelineRange]);

  const handleTimelineReset = React.useCallback(() => {
    setTimelineAutoRange(true);
    syncTimelineRange();
  }, [syncTimelineRange]);

  const toTimestamp = React.useCallback((value?: string | null): number => {
    if (!value) return 0;
    const normalized = value.replace(/\s+/g, ' ');
    const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}:?\d{2})?$/);
    if (isoMatch) {
      const offset = isoMatch[3]
        ? isoMatch[3].length === 5
          ? isoMatch[3]
          : `${isoMatch[3].slice(0, 3)}:${isoMatch[3].slice(3)}`
        : 'Z';
      const d = new Date(`${isoMatch[1]}T${isoMatch[2]}${offset}`);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }, []);

  React.useEffect(() => {
    const payload = piQuery.data as PublicInspectionResponse | undefined;
    if (!payload) return;
    const list: PiDoc[] = (payload?.results || []).map((x: any) => x?.attributes ?? x);
    setDocs(list);
    setRaw(payload);
    setSearchDetails(null);
    const pickUpdated = (d: any) => d?.page_views?.last_updated || null;
    const latestFor = (pred: (d: PiDoc) => boolean) => {
      let bestTs = 0;
      let bestStr: string | null = null;
      for (const it of list) {
        if (!pred(it)) continue;
        const ts = toTimestamp(pickUpdated(it));
        if (ts > bestTs) {
          bestTs = ts;
          bestStr = pickUpdated(it);
        }
      }
      return bestStr;
    };
    setSpecialUpdatedAt(
      latestFor((d) => String(d.filing_type || '').toLowerCase().includes('special')) || null
    );
    setRegularUpdatedAt(
      latestFor((d) => !String(d.filing_type || '').toLowerCase().includes('special')) || null
    );
    setError(null);
    setNoDataSet((prev) => {
      const next = new Set(prev);
      if (list.length === 0) next.add(date);
      else next.delete(date);
      return next;
    });
  }, [piQuery.data, toTimestamp, date]);

  React.useEffect(() => {
    if (!piQuery.error) return;
    const message =
      piQuery.error instanceof Error ? piQuery.error.message : String(piQuery.error);
    setError(message);
    setDocs([]);
    setRaw(null);
    setSpecialUpdatedAt(null);
    setRegularUpdatedAt(null);
    setSearchDetails(null);
    setTimelineData(null);
    setNoDataSet((prev) => {
      const next = new Set(prev);
      next.add(date);
      return next;
    });
  }, [piQuery.error, date]);

  // 初次載入以 current 載入最近一期，避免空白頁
  React.useEffect(() => {
    if (!currentQuery.data || !shouldFetchCurrent) return;
    const list: PiDoc[] = (currentQuery.data?.results || []).map((x: any) => x?.attributes ?? x);
    if (Array.isArray(list) && list.length > 0) {
      const ymd = String(
        (list.find((x) => (x as any)?.last_public_inspection_issue) as any)?.last_public_inspection_issue ||
          (list[0]?.publication_date ? String(list[0]?.publication_date).slice(0, 10) : '') ||
          (list[0]?.filed_at ? String(list[0]?.filed_at).slice(0, 10) : '')
      );
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) setSelected(new Date(`${ymd}T00:00:00`));
    }
    setShouldFetchCurrent(false);
  }, [currentQuery.data, shouldFetchCurrent]);

  React.useEffect(() => {
    if (!currentQuery.error || !shouldFetchCurrent) return;
    setShouldFetchCurrent(false);
  }, [currentQuery.error, shouldFetchCurrent]);

  React.useEffect(() => {
    setShouldFetchCurrent(true);
  }, [debugMode, baseUri]);

  React.useEffect(() => {
    if (!timelineQuery.isSuccess) return;
    const payload = timelineQuery.data?.payload;
    const details = payload?.details ?? payload ?? null;
    setTimelineData(details);
  }, [timelineQuery.isSuccess, timelineQuery.data]);

  React.useEffect(() => {
    if (!timelineQuery.error) return;
    setTimelineData(null);
  }, [timelineQuery.error]);

  React.useEffect(() => {
    if (timelineEnabled) return;
    setTimelineData(null);
  }, [timelineEnabled]);

  // 同步輸入框字串
  React.useEffect(() => { setInputDateStr(date); }, [date]);

  const runSearchDetails = React.useCallback(() => {
    searchDetailsMutation.mutate(
      { date, debugMode, baseUri },
      {
        onSuccess: (data) => setSearchDetails(data),
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
        },
      }
    );
  }, [searchDetailsMutation, date, debugMode, baseUri]);

  // 移除 issue facets 的遠端呼叫，Updated 僅由 available_on 結果的 page_views.last_updated 計算

  // 分類
  const isSpecial = (d: PiDoc) => String(d.filing_type || '').toLowerCase().includes('special');
  const specialDocs = docs.filter(isSpecial);
  const regularDocs = docs.filter(d => !isSpecial(d));

  function groupByAgency(list: PiDoc[]): Array<{ agency: string; items: PiDoc[] }> {
    const map: Record<string, PiDoc[]> = {};
    for (const it of list) {
      const agency = String(it.agencies?.[0]?.name || 'Unknown Agency');
      if (!map[agency]) map[agency] = [];
      map[agency].push(it);
    }
    return Object.keys(map).sort().map(k => ({ agency: k, items: map[k] }));
  }

  const specialGroups = React.useMemo(() => groupByAgency(specialDocs), [specialDocs]);
  const regularGroups = React.useMemo(() => groupByAgency(regularDocs), [regularDocs]);
  const timelineDetails = React.useMemo(() => {
    if (!timelineData) return null;
    return timelineData.details ?? timelineData;
  }, [timelineData]);
  const timelineSeries = React.useMemo<Array<{ label: string; value: string; count: number }>>(() => {
    const filters = Array.isArray(timelineDetails?.filters) ? timelineDetails.filters : [];
    const availableFilter = filters.find((f: any) => {
      const name = String(f?.name ?? '');
      return name === 'available_on' || name === 'publication_date';
    });
    const options = Array.isArray(availableFilter?.options) ? availableFilter.options : [];
    return options.map((opt: any) => ({
      label: opt.label ?? opt.value ?? '',
      value: opt.value ?? opt.label ?? '',
      count: typeof opt.count === 'number' ? opt.count : (typeof opt.total === 'number' ? opt.total : 0),
    }));
  }, [timelineDetails]);
  const timelineSuggestions = React.useMemo(() => {
    const suggestions = timelineDetails?.suggestions;
    return Array.isArray(suggestions) ? suggestions : [];
  }, [timelineDetails]);
  const timelineErrorMessage = timelineQuery.error
    ? timelineQuery.error instanceof Error
      ? timelineQuery.error.message
      : String(timelineQuery.error)
    : null;
  const timelineUrl = timelineQuery.data?.url;
  const timelineLoading = timelineEnabled && (timelineQuery.isLoading || timelineQuery.isFetching);

  return (
    <div className="space-y-4">
      {/* Header + Debug */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-lg font-bold tracking-wide">
            {date}
          </div>
          <h2 className="text-xl font-semibold">Public Inspection</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="pi-switch-debug" className="text-xs">Debug mode</Label>
          <Switch id="pi-switch-debug" checked={debugMode} onCheckedChange={(v: boolean) => setDebugMode(Boolean(v))} />
        </div>
      </div>

      {/* 左：說明卡；右：摘要 + 日期卡 */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_0.9fr] gap-3 md:gap-6">
        <div>
          <PublicInspectionInfoCard manualText={manual} />
        </div>
        <div className="space-y-3 md:min-w-[360px] w-full">
          {/* Summary banner（右欄頂部） */}
          <Card className="shadow-sm border bg-accent/20">
            <CardHeader className="p-4 md:p-5">
              <div className="grid grid-cols-2 md:[grid-template-columns:auto_auto_auto_minmax(0,1fr)] gap-2 md:gap-4 text-sm place-items-center text-center">
                <div>
                  <div className="text-muted-foreground">Documents</div>
                  <div className="text-lg md:text-xl font-bold">{docs.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Special</div>
                  <div className="text-lg md:text-xl font-bold">{specialDocs.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Regular</div>
                  <div className="text-lg md:text-xl font-bold">{regularDocs.length}</div>
                </div>
                <div className="col-span-2 md:col-auto text-xs md:text-sm text-center">
                  <div className="text-foreground">Updated</div>
                  <div className="text-muted-foreground break-words">S: {specialUpdatedAt || '-'}</div>
                  <div className="text-muted-foreground break-words">R: {regularUpdatedAt || '-'}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs md:text-sm">
                <div className="text-muted-foreground">
                  Source: <a className="text-primary underline" href="https://www.federalregister.gov/public-inspection/current" target="_blank" rel="noreferrer">federalregister.gov</a>
                </div>
                {debugMode && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={runSearchDetails}
                    disabled={searchDetailsMutation.isPending}
                  >
                    {searchDetailsMutation.isPending ? 'Loading...' : 'Search Details (PI)'}
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* 日期卡：Today + Input + Go 置中；月曆加寬置中 */}
          <Card className="shadow-sm">
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Timeline / Search Details</CardTitle>
              <CardDescription className="text-xs">依日期範圍顯示 filing 分佈與建議搜尋</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="timeline-start" className="text-xs">開始日期</Label>
                  <Input id="timeline-start" type="date" value={timelineStart} onChange={(e) => { setTimelineAutoRange(false); setTimelineStart(e.target.value); }} className="h-8 text-xs" />
                </div>
                <div>
                  <Label htmlFor="timeline-end" className="text-xs">結束日期</Label>
                  <Input id="timeline-end" type="date" value={timelineEnd} onChange={(e) => { setTimelineAutoRange(false); setTimelineEnd(e.target.value); }} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{timelineAutoRange ? '自動追蹤所選日期 ±3 天' : '已切換為手動區間'}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8" onClick={handleTimelineReset}>重設區間</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => timelineQuery.refetch()} disabled={!timelineEnabled || timelineLoading}>{timelineLoading ? '載入中…' : '重新整理'}</Button>
                </div>
              </div>
              {!timelineEnabled && (
                <Alert>
                  <AlertTitle>日期範圍無效</AlertTitle>
                  <AlertDescription>請輸入有效的開始與結束日期。</AlertDescription>
                </Alert>
              )}
              {timelineEnabled && timelineLoading && (
                <div className="text-xs text-muted-foreground">Timeline 資料載入中…</div>
              )}
              {timelineEnabled && !timelineLoading && timelineErrorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>Timeline 讀取失敗</AlertTitle>
                  <AlertDescription>{timelineErrorMessage}</AlertDescription>
                </Alert>
              )}
              {timelineEnabled && !timelineLoading && !timelineErrorMessage && (
                <>
                  <div>
                    <div className="text-xs font-semibold mb-1">日期分佈</div>
                    {timelineSeries.length === 0 ? (
                      <div className="text-xs text-muted-foreground">目前查詢沒有 timeline 資料。</div>
                    ) : (
                      <ul className="text-xs divide-y divide-border rounded-md border">
                        {timelineSeries.slice(0, 10).map((item) => (
                          <li key={`${item.value}-${item.label}`} className="flex items-center justify-between px-2 py-1">
                            <span className="truncate">{item.value || item.label}</span>
                            <span className="ml-3 text-muted-foreground">{item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {timelineSuggestions.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1">建議搜尋</div>
                      <ul className="text-xs space-y-1">
                        {timelineSuggestions.slice(0, 3).map((suggestion: any, idx: number) => (
                          <li key={`${suggestion.text || suggestion.url || idx}`} className="truncate">
                            {suggestion.url ? (
                              <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={suggestion.url}>
                                {suggestion.text || suggestion.url}
                              </a>
                            ) : (
                              suggestion.text || suggestion.url || '（無標題）'
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {timelineUrl && (
                    <div className="text-[11px] text-muted-foreground break-all">Source: {timelineUrl}</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected(new Date())}>Today</Button>
                <Input id="pi-date" value={inputDateStr} onChange={(e)=> { setInputDateStr(e.target.value); }} className="h-8 text-sm w-[140px]" placeholder="YYYY-MM-DD" />
                <Button size="sm" variant="outline" className="h-8" onClick={()=> { const v=inputDateStr.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { setSelected(new Date(v+'T00:00:00')); } }} disabled={loading}>Go</Button>
              </div>
              <div className="mt-3 rounded-md border shadow-sm p-2 bg-card mx-auto w-fit">
                <Calendar className="[--cell-size:2.25rem] md:[--cell-size:2.5rem]"
                  mode="single"
                  selected={selected}
                  onSelect={(d)=> { if (d) setSelected(d); }}
                  captionLayout="dropdown"
                  showOutsideDays
                  disabled={[(day)=> day > new Date(), (day)=> noDataSet.has(toYMDLocal(day))]}
                />
              </div>
              {debugMode && (
                <div className="mt-2 text-xs text-muted-foreground text-center">Disabled hints: future dates、known empty dates（逐步累積）</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filing TOC */}
      <Tabs defaultValue="special">
        <TabsList>
          <TabsTrigger value="special">Special Filing</TabsTrigger>
          <TabsTrigger value="regular">Regular Filing</TabsTrigger>
        </TabsList>
        <TabsContent value="special">
          <Card>
            <CardContent className="p-3 md:p-4">
              {specialGroups.length === 0 && <div className="text-xs text-muted-foreground">No special filings.</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="md:col-span-2"><CardContent className="p-3 md:p-4 space-y-4 divide-y divide-border">
                  {specialGroups.map(g => (
                    <div key={`sf-${g.agency}`} className="py-2 first:pt-0">
                      <div className="text-sm font-semibold mb-1">{g.agency}</div>
                      <ul className="space-y-2">
                        {g.items.map((d) => (
                          <li key={d.document_number} className="text-xs">
                            <div className="font-medium">
                              {d.html_url ? <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.html_url}>{d.title}</a> : d.title}
                            </div>
                            <div className="mt-0.5 text-muted-foreground">Filed: {d.filed_at || ''} · Scheduled: {d.publication_date || ''} · FR: {d.document_number}</div>
                            <div className="mt-0.5 flex items-center gap-2">
                              {d.pdf_url && <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.pdf_url}>PDF{d.num_pages?` ${d.num_pages}p`:''}{d.pdf_file_size?` (${Math.round(d.pdf_file_size/1024)} KB)`:''}</a>}
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                                onClick={() => loadDocumentDetails(d.document_number)}
                              >
                                {expandedDoc === d.document_number ? '收合詳情' : '顯示詳情'}
                              </Button>
                            </div>
                            {expandedDoc === d.document_number && (
                              <div className="mt-2 rounded-md border border-border p-2 text-xs bg-muted/40">
                                {expandedLoading && <div>載入文件詳情...</div>}
                                {expandedError && <div className="text-destructive">{expandedError}</div>}
                                {!expandedLoading && !expandedError && expandedDetail && (
                                  <DocumentDetails doc={expandedDetail} />
                                )}
                                {debugMode && expandedRaw && (
                                  <div className="mt-2">
                                    <CollapsibleJson title="FR Document (Raw)" data={expandedRaw} />
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent></Card>
                <Card><CardHeader className="p-3 md:p-4 pb-2"><CardTitle className="text-xs font-semibold">Special Filing Agencies</CardTitle></CardHeader><CardContent className="p-3 md:p-4 pt-0">
                  <ul className="space-y-1">
                    {specialGroups.map(g => (
                      <li key={`sfa-${g.agency}`} className="flex items-center justify-between text-xs">
                        <span className="truncate" title={g.agency}>{g.agency}</span>
                        <span className="ml-2 text-muted-foreground">{g.items.length}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="regular">
          <Card>
            <CardContent className="p-3 md:p-4">
              {regularGroups.length === 0 && <div className="text-xs text-muted-foreground">No regular filings.</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="md:col-span-2"><CardContent className="p-3 md:p-4 space-y-4 divide-y divide-border">
                  {regularGroups.map(g => (
                    <div key={`rf-${g.agency}`} className="py-2 first:pt-0">
                      <div className="text-sm font-semibold mb-1">{g.agency}</div>
                      <ul className="space-y-2">
                        {g.items.map((d) => (
                          <li key={d.document_number} className="text-xs">
                            <div className="font-medium">
                              {d.html_url ? <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.html_url}>{d.title}</a> : d.title}
                            </div>
                            <div className="mt-0.5 text-muted-foreground">Filed: {d.filed_at || ''} · Scheduled: {d.publication_date || ''} · FR: {d.document_number}</div>
                            <div className="mt-0.5 flex items-center gap-2">
                              {d.pdf_url && <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.pdf_url}>PDF{d.num_pages?` ${d.num_pages}p`:''}{d.pdf_file_size?` (${Math.round(d.pdf_file_size/1024)} KB)`:''}</a>}
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                                onClick={() => loadDocumentDetails(d.document_number)}
                              >
                                {expandedDoc === d.document_number ? '收合詳情' : '顯示詳情'}
                              </Button>
                            </div>
                            {expandedDoc === d.document_number && (
                              <div className="mt-2 rounded-md border border-border p-2 text-xs bg-muted/40">
                                {expandedLoading && <div>載入文件詳情...</div>}
                                {expandedError && <div className="text-destructive">{expandedError}</div>}
                                {!expandedLoading && !expandedError && expandedDetail && (
                                  <DocumentDetails doc={expandedDetail} />
                                )}
                                {debugMode && expandedRaw && (
                                  <div className="mt-2">
                                    <CollapsibleJson title="FR Document (Raw)" data={expandedRaw} />
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent></Card>
                <Card><CardHeader className="p-3 md:p-4 pb-2"><CardTitle className="text-xs font-semibold">Regular Filing Agencies</CardTitle></CardHeader><CardContent className="p-3 md:p-4 pt-0">
                  <ul className="space-y-1">
                    {regularGroups.map(g => (
                      <li key={`rfa-${g.agency}`} className="flex items-center justify-between text-xs">
                        <span className="truncate" title={g.agency}>{g.agency}</span>
                        <span className="ml-2 text-muted-foreground">{g.items.length}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug */}
      {debugMode && (
        <Card className="p-3 md:p-4">
          {raw && <CollapsibleJson title="Public Inspection (available_on) Raw" data={raw} />}
          {searchDetails && <div className="mt-2"><CollapsibleJson title="Search Details (PI)" data={searchDetails} /></div>}
          {timelineDetails && <div className="mt-2"><CollapsibleJson title="Timeline Search Details" data={timelineDetails} /></div>}
        </Card>
      )}
    </div>
  );
}
