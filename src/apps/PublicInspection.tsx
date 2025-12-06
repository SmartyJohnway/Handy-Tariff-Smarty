import React from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CollapsibleJson } from "@/components/ui/CollapsibleJson";
import { Calendar } from "@/components/ui/calendar";
import PublicInspectionInfoCard from "@/components/fr/PublicInspectionInfoCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePublicInspectionQuery, type PublicInspectionResponse } from '@/hooks/queries/usePublicInspectionQuery';
import { usePublicInspectionCurrentQuery } from '@/hooks/queries/usePublicInspectionCurrentQuery';
import { usePublicInspectionSearchDetailsMutation } from '@/hooks/mutations/usePublicInspectionSearchDetailsMutation';
import { DocumentDetails } from '@/components/fr/DocumentDetails';

import type { NormalizedFRDoc } from '@/lib/frNormalize';
import { fetchNormalizedFrDoc } from '@/lib/frDocDetail';

type PiDoc = {
  document_number: string;
  title: string;
  filing_type?: string;
  agencies?: Array<{ name?: string; slug?: string }>;
  pdf_url?: string;
  num_pages?: number;
  pdf_file_size?: number;
  filed_at?: string;
  publication_date?: string;
  html_url?: string;
};

function toYMDLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PublicInspection() {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Date>(new Date());
  const date = React.useMemo(() => toYMDLocal(selected), [selected]);
  const [debugMode, setDebugMode] = React.useState<boolean>(false);
  const DEFAULT_BASE_URI = "https://www.federalregister.gov/api/v1";
  const [baseUri, setBaseUri] = React.useState<string>(DEFAULT_BASE_URI);

  const [error, setError] = React.useState<string | null>(null);
  const [docs, setDocs] = React.useState<PiDoc[]>([]);
  const [raw, setRaw] = React.useState<any | null>(null);
  const [searchDetails, setSearchDetails] = React.useState<any | null>(null);
  const [specialUpdatedAt, setSpecialUpdatedAt] = React.useState<string | null>(null);
  const [regularUpdatedAt, setRegularUpdatedAt] = React.useState<string | null>(null);
  const [noDataSet, setNoDataSet] = React.useState<Set<string>>(new Set());
  const [manual, setManual] = React.useState<string>("");
  const [inputDateStr, setInputDateStr] = React.useState<string>("");
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

  const toTimestamp = React.useCallback((value?: string | null): number => {
    if (!value) return 0;
    const normalized = value.replace(/\s+/g, " ");
    const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}:?\d{2})?$/);
    if (isoMatch) {
      const offset = isoMatch[3]
        ? isoMatch[3].length === 5
          ? isoMatch[3]
          : `${isoMatch[3].slice(0, 3)}:${isoMatch[3].slice(3)}`
        : "Z";
      const d = new Date(`${isoMatch[1]}T${isoMatch[2]}${offset}`);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }, []);

  const loadDocumentDetails = React.useCallback(
    async (docnum: string) => {
      const normalized = (docnum || "").trim();
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
          setExpandedError(t("fr.pi.errorNoDetail"));
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
    [expandedDoc, queryClient, debugMode, baseUri, t],
  );

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
      latestFor((d) => String(d.filing_type || "").toLowerCase().includes("special")) || null
    );
    setRegularUpdatedAt(
      latestFor((d) => !String(d.filing_type || "").toLowerCase().includes("special")) || null
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
    const message = piQuery.error instanceof Error ? piQuery.error.message : String(piQuery.error);
    setError(message);
    setDocs([]);
    setRaw(null);
    setSpecialUpdatedAt(null);
    setRegularUpdatedAt(null);
    setSearchDetails(null);
  }, [piQuery.error, date]);

  React.useEffect(() => {
    if (!currentQuery.data || !shouldFetchCurrent) return;
    const list: PiDoc[] = (currentQuery.data?.results || []).map((x: any) => x?.attributes ?? x);
    if (Array.isArray(list) && list.length > 0) {
      const ymd = String(
        (list.find((x) => (x as any)?.last_public_inspection_issue) as any)?.last_public_inspection_issue ||
          (list[0]?.publication_date ? String(list[0]?.publication_date).slice(0, 10) : "") ||
          (list[0]?.filed_at ? String(list[0]?.filed_at).slice(0, 10) : "")
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
    setInputDateStr(date);
  }, [date]);

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

  const isSpecial = (d: PiDoc) => String(d.filing_type || "").toLowerCase().includes("special");
  const specialDocs = docs.filter(isSpecial);
  const regularDocs = docs.filter((d) => !isSpecial(d));

  function groupByAgency(list: PiDoc[]): Array<{ agency: string; items: PiDoc[] }> {
    const map: Record<string, PiDoc[]> = {};
    for (const it of list) {
      const agency = String(it.agencies?.[0]?.name || t("fr.pi.unknownAgency"));
      if (!map[agency]) map[agency] = [];
      map[agency].push(it);
    }
    return Object.keys(map)
      .sort()
      .map((k) => ({ agency: k, items: map[k] }));
  }

  const specialGroups = React.useMemo(() => groupByAgency(specialDocs), [specialDocs]);
  const regularGroups = React.useMemo(() => groupByAgency(regularDocs), [regularDocs]);

  const renderDocMeta = (d: PiDoc) =>
    `${t("fr.pi.filed")}: ${d.filed_at || ""} · ${t("fr.pi.scheduled")}: ${d.publication_date || ""} · ${t("fr.pi.frNumber")}: ${d.document_number}`;

  const renderPdfLabel = (d: PiDoc) => {
    if (!d.pdf_url) return null;
    const pages = d.num_pages ? ` ${d.num_pages}p` : "";
    const size = d.pdf_file_size ? ` (${Math.round(d.pdf_file_size / 1024)} KB)` : "";
    return `${t("fr.pi.pdf")}${pages}${size}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-lg font-bold tracking-wide">
            {date}
          </div>
          <h2 className="text-xl font-semibold">{t("fr.pi.title")}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="pi-switch-debug" className="text-xs">
            {t("fr.pi.debug")}
          </Label>
          <Switch id="pi-switch-debug" checked={debugMode} onCheckedChange={(v: boolean) => setDebugMode(Boolean(v))} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_0.9fr] gap-3 md:gap-6">
        <div>
          <PublicInspectionInfoCard manualText={manual} />
        </div>
        <div className="space-y-3 md:min-w-[360px] w-full">
          <Card className="shadow-sm border bg-accent/20">
            <CardHeader className="p-4 md:p-5">
              <div className="grid grid-cols-2 md:[grid-template-columns:auto_auto_auto_minmax(0,1fr)] gap-2 md:gap-4 text-sm place-items-center text-center">
                <div>
                  <div className="text-muted-foreground">{t("fr.pi.documents")}</div>
                  <div className="text-lg md:text-xl font-bold">{docs.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("fr.pi.special")}</div>
                  <div className="text-lg md:text-xl font-bold">{specialDocs.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("fr.pi.regular")}</div>
                  <div className="text-lg md:text-xl font-bold">{regularDocs.length}</div>
                </div>
                <div className="col-span-2 md:col-auto text-xs md:text-sm text-center">
                  <div className="text-foreground">{t("fr.pi.updated")}</div>
                  <div className="text-muted-foreground break-words">
                    {t("fr.pi.specialShort")}: {specialUpdatedAt || "-"}
                  </div>
                  <div className="text-muted-foreground break-words">
                    {t("fr.pi.regularShort")}: {regularUpdatedAt || "-"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs md:text-sm">
                <div className="text-muted-foreground">
                  {t("fr.pi.source")}{" "}
                  <a className="text-primary underline" href="https://www.federalregister.gov/public-inspection/current" target="_blank" rel="noreferrer">
                    federalregister.gov
                  </a>
                </div>
                {debugMode && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={runSearchDetails}
                    disabled={searchDetailsMutation.isPending}
                  >
                    {searchDetailsMutation.isPending ? t("fr.pi.loading") : t("fr.pi.searchDetailsPi")}
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected(new Date())}>
                  {t("fr.pi.today")}
                </Button>
                <Input
                  id="pi-date"
                  value={inputDateStr}
                  onChange={(e) => {
                    setInputDateStr(e.target.value);
                  }}
                  className="h-8 text-sm w-[140px]"
                  placeholder="YYYY-MM-DD"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    const v = inputDateStr.trim();
                    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                      setSelected(new Date(v + "T00:00:00"));
                    }
                  }}
                  disabled={loading}
                >
                  {t("fr.pi.go")}
                </Button>
              </div>
              <div className="mt-3 rounded-md border shadow-sm p-2 bg-card mx-auto w-fit">
                <Calendar
                  className="[--cell-size:2.25rem] md:[--cell-size:2.5rem]"
                  mode="single"
                  selected={selected}
                  onSelect={(d) => {
                    if (d) setSelected(d);
                  }}
                  captionLayout="dropdown"
                  showOutsideDays
                  disabled={[(day) => day > new Date(), (day) => noDataSet.has(toYMDLocal(day))]}
                />
              </div>
              {debugMode && (
                <div className="mt-2 text-xs text-muted-foreground text-center">{t("fr.pi.disabledHint")}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="special">
        <TabsList>
          <TabsTrigger value="special">{t("fr.pi.tabSpecial")}</TabsTrigger>
          <TabsTrigger value="regular">{t("fr.pi.tabRegular")}</TabsTrigger>
        </TabsList>
        <TabsContent value="special">
          <Card>
            <CardContent className="p-3 md:p-4">
              {specialGroups.length === 0 && <div className="text-xs text-muted-foreground">{t("fr.pi.noSpecial")}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="md:col-span-2">
                  <CardContent className="p-3 md:p-4 space-y-4 divide-y divide-border">
                    {specialGroups.map((g) => (
                      <div key={`sf-${g.agency}`} className="py-2 first:pt-0">
                        <div className="text-sm font-semibold mb-1">{g.agency}</div>
                        <ul className="space-y-2">
                          {g.items.map((d) => (
                            <li key={d.document_number} className="text-xs">
                              <div className="font-medium">
                                {d.html_url ? (
                                  <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.html_url}>
                                    {d.title}
                                  </a>
                                ) : (
                                  d.title
                                )}
                              </div>
                              <div className="mt-0.5 text-muted-foreground">{renderDocMeta(d)}</div>
                              <div className="mt-0.5 flex items-center gap-2">
                                {d.pdf_url && (
                                  <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.pdf_url}>
                                    {renderPdfLabel(d)}
                                  </a>
                                )}
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto px-0 text-xs"
                                  onClick={() => loadDocumentDetails(d.document_number)}
                                >
                                  {expandedDoc === d.document_number ? t("fr.pi.hideDetail") : t("fr.pi.showDetail")}
                                </Button>
                              </div>
                              {expandedDoc === d.document_number && (
                                <div className="mt-2 rounded-md border border-border p-2 text-xs bg-muted/40">
                                  {expandedLoading && <div>{t("fr.pi.loadingDetail")}</div>}
                                  {expandedError && <div className="text-destructive">{expandedError}</div>}
                                  {!expandedLoading && !expandedError && expandedDetail && <DocumentDetails doc={expandedDetail} />}
                                  {debugMode && expandedRaw && (
                                    <div className="mt-2">
                                      <CollapsibleJson title={t("fr.pi.frRaw")} data={expandedRaw} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 md:p-4 pb-2">
                    <CardTitle className="text-xs font-semibold">{t("fr.pi.specialAgencies")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4 pt-0">
                    <ul className="space-y-1">
                      {specialGroups.map((g) => (
                        <li key={`sfa-${g.agency}`} className="flex items-center justify-between text-xs">
                          <span className="truncate" title={g.agency}>
                            {g.agency}
                          </span>
                          <span className="ml-2 text-muted-foreground">{g.items.length}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="regular">
          <Card>
            <CardContent className="p-3 md:p-4">
              {regularGroups.length === 0 && <div className="text-xs text-muted-foreground">{t("fr.pi.noRegular")}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="md:col-span-2">
                  <CardContent className="p-3 md:p-4 space-y-4 divide-y divide-border">
                    {regularGroups.map((g) => (
                      <div key={`rf-${g.agency}`} className="py-2 first:pt-0">
                        <div className="text-sm font-semibold mb-1">{g.agency}</div>
                        <ul className="space-y-2">
                          {g.items.map((d) => (
                            <li key={d.document_number} className="text-xs">
                              <div className="font-medium">
                                {d.html_url ? (
                                  <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.html_url}>
                                    {d.title}
                                  </a>
                                ) : (
                                  d.title
                                )}
                              </div>
                              <div className="mt-0.5 text-muted-foreground">{renderDocMeta(d)}</div>
                              <div className="mt-0.5 flex items-center gap-2">
                                {d.pdf_url && (
                                  <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={d.pdf_url}>
                                    {renderPdfLabel(d)}
                                  </a>
                                )}
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto px-0 text-xs"
                                  onClick={() => loadDocumentDetails(d.document_number)}
                                >
                                  {expandedDoc === d.document_number ? t("fr.pi.hideDetail") : t("fr.pi.showDetail")}
                                </Button>
                              </div>
                              {expandedDoc === d.document_number && (
                                <div className="mt-2 rounded-md border border-border p-2 text-xs bg-muted/40">
                                  {expandedLoading && <div>{t("fr.pi.loadingDetail")}</div>}
                                  {expandedError && <div className="text-destructive">{expandedError}</div>}
                                  {!expandedLoading && !expandedError && expandedDetail && <DocumentDetails doc={expandedDetail} />}
                                  {debugMode && expandedRaw && (
                                    <div className="mt-2">
                                      <CollapsibleJson title={t("fr.pi.frRaw")} data={expandedRaw} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 md:p-4 pb-2">
                    <CardTitle className="text-xs font-semibold">{t("fr.pi.regularAgencies")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4 pt-0">
                    <ul className="space-y-1">
                      {regularGroups.map((g) => (
                        <li key={`rfa-${g.agency}`} className="flex items-center justify-between text-xs">
                          <span className="truncate" title={g.agency}>
                            {g.agency}
                          </span>
                          <span className="ml-2 text-muted-foreground">{g.items.length}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {debugMode && (
        <Card className="p-3 md:p-4">
          {raw && <CollapsibleJson title={t("fr.pi.rawAvailable")} data={raw} />}
          {searchDetails && (
            <div className="mt-2">
              <CollapsibleJson title={t("fr.pi.searchDetailsPi")} data={searchDetails} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
