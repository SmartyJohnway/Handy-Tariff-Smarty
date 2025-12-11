import React, { useState, useEffect, useMemo, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryClient } from '@tanstack/react-query';
import { useSearch, HtsItem } from '@/context/SearchContext';
import { useHtsDetailsQuery } from '@/hooks/queries/useHtsDetailsQuery';
import { fetchHtsDetails, HtsFootnote } from '@/hooks/queries/useHtsSearchQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifier } from '@/context/NotificationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, FileText, BarChart2, Landmark, Database, ShieldAlert, AlertTriangle, CalendarDays } from 'lucide-react';
import { CollapsibleJson } from '@/components/ui/CollapsibleJson';

import { DocumentDetails } from '@/components/fr/DocumentDetails';
import { searchDocuments } from "@/lib/frTsApi2";

import { fetchNormalizedFrDoc } from '@/lib/frDocDetail';
import { normalizeResults, formatExcerpt, NormalizedFRDoc } from "@/lib/frNormalize";

// --- Local Type Extensions ---
// Extend HtsItem to include properties fetched from get-hts-details
type HtsItemWithDetails = HtsItem & {
    extra_duties?: {
        s232_steel?: boolean;
        s232_aluminum?: boolean;
        s301?: boolean;
    };
    investigations?: any[];
    effectiveDate?: string;
    endDate?: string;
};

// Footnote popover content: fetches detailed HTS info via the new microservice
const FootnoteDetails = ({ htsCode }: { htsCode: string }): React.ReactElement | null => {
    const { addNotification } = useNotifier();
    const { t } = useTranslation();
    const { data, error, isLoading } = useHtsDetailsQuery(htsCode);

    useEffect(() => {
        if (error) {
            const message = error instanceof Error ? error.message : t('fr.htsCard.detailLoadFailed');
            addNotification(t('fr.htsCard.detailLoadFailedDesc', { message }), 'error');
        }
    }, [error, addNotification, htsCode, t]);

    if (isLoading) return <div className="text-destructive text-sm p-2">{t('status.loading')}</div>;
    if (error) {
        const message = error instanceof Error ? error.message : t('fr.htsCard.detailLoadFailed');
        return <div className="text-destructive text-sm p-2 bg-destructive/10 rounded">{message}</div>;
    }
    if (!data) return null;

    const it = data as any;
    return (
        <div className="bg-muted/50 rounded-lg p-3 text-sm border border-border">
            <div className="font-semibold text-foreground">{it.description || t('fr.htsCard.noDescription')}</div>
            <div className="mt-2 space-y-1 text-muted-foreground">
                {it.base_rate && <div>{t('fr.htsCard.rateGeneral')}: {it.base_rate}</div>}
                {it.special && <div>{t('fr.htsCard.rateSpecial')}: {it.special}</div>}
                {it.other && <div>{t('fr.htsCard.rateOther')}: {it.other}</div>}
            </div>
        </div>
    );
};

const FrDocsList = ({ docs }: { docs: (any & { agencies_text?: string })[] }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<NormalizedFRDoc | null>(null);
  const [expandedRaw, setExpandedRaw] = useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  if (!docs || docs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('fr.htsCard.noData')}</p>;
  }

  const toggleDoc = async (docnum: string) => {
    if (!docnum) return;
    if (expandedDoc === docnum) {
      setExpandedDoc(null);
      setExpandedDetail(null);
      setExpandedRaw(null);
      setExpandedError(null);
      return;
    }
    setExpandedDoc(docnum);
    setExpandedDetail(null);
    setExpandedRaw(null);
    setExpandedError(null);
    setExpandedLoading(true);
    try {
      const result = await fetchNormalizedFrDoc(queryClient, docnum);
      setExpandedRaw(result.raw);
      if (result.normalized) {
        setExpandedDetail(result.normalized);
      } else {
        setExpandedError(t('fr.htsCard.docNotFound'));
      }
    } catch (err) {
      setExpandedError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpandedLoading(false);
    }
  };

  return (
    <div className="grid gap-3">
      {docs.map((d) => (
        <div key={d.document_number} className="border rounded-lg p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{d.type}</Badge>
            <span className="font-medium text-foreground">{d.title}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t('fr.htsCard.docMeta', {
              date: d.publication_date,
              agencies: d.agencies_text || (Array.isArray(d.agencies) ? d.agencies.map((a: any) => (a?.name || a?.raw_name || '')).filter(Boolean).join(', ') : '')
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href={d.html_url} target="_blank" rel="noreferrer">
              {t('fr.htsCard.linkOriginal')} <ExternalLink className="h-3 w-3" />
            </a>
            {d.body_html_url && (
              <a className="inline-flex items-center gap-1 text-primary hover:underline hover:text-primary/80" href={d.body_html_url} target="_blank" rel="noreferrer">
                {t('fr.htsCard.linkFullText')} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {d.public_inspection_pdf_url && (
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={d.public_inspection_pdf_url} target="_blank" rel="noreferrer">
                {t('fr.htsCard.linkPublicInspection')} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => toggleDoc(d.document_number)}>
              {expandedDoc === d.document_number ? t('fr.htsCard.hideDocDetail') : t('fr.htsCard.showDocDetail')}
            </Button>
          </div>
          {expandedDoc === d.document_number && (
            <div className="mt-2 border rounded-md p-2 bg-muted/40 text-xs">
              {expandedLoading && <div>{t('fr.htsCard.loadingDocDetail')}</div>}
              {expandedError && <div className="text-destructive">{expandedError}</div>}
              {!expandedLoading && !expandedError && expandedDetail && (
                <DocumentDetails doc={expandedDetail} />
              )}
              {!expandedLoading && !expandedError && !expandedDetail && (
                <div>{t('fr.htsCard.docNotFound')}</div>
              )}
              {expandedRaw && (
                <div className="mt-2">
                  <CollapsibleJson title={t('fr.htsCard.rawTitle')} data={expandedRaw} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * 渲染「總覽」分頁內容的子元件
 */
const OverviewTab = ({ details }: { details: any }) => {
    const { t } = useTranslation();
    if (!details) return null;
    const formatUSD = (n?: number) => typeof n === "number" ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

    return (
        <div className="space-y-4">
            {/* 1. Trade Stats */}
            {details.tradeStats?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart2 className="h-4 w-4" />
                            {t('fr.htsCard.tradeStatsTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 mt-1 text-sm text-muted-foreground">
                            {details.tradeStats.map((stat: any, i: number) => (
                                <li key={i}>{stat.year}: {formatUSD(stat.value)}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
            {/* 2. Investigations */}
            {details.investigations?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Landmark className="h-4 w-4" />
                            {t('fr.htsCard.investigationsTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {details.investigations.map((inv: any, i: number) => (
                                <div key={i} className="text-sm">
                                    <a href={inv.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                        {inv.title}
                                    </a>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        <p><span className="font-semibold">{t('fr.htsCard.caseNumber')}:</span> {Array.isArray(inv.caseNumbers) ? inv.caseNumbers.join(', ') : t('status.empty')}</p>
                                        <p><span className="font-semibold">{t('fr.htsCard.countries')}:</span> {Array.isArray(inv.countries) ? inv.countries.join(', ') : t('status.empty')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* 3. Programs DataWeb */}
            {details.programs_dataweb?.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('fr.htsCard.programsTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {details.programs_dataweb.map((prog: any, i: number) => (
                                <Badge key={i} variant={prog.status === 'Eligible' ? 'default' : 'outline'} className={prog.status === 'Eligible' ? 'bg-success/10 text-success border border-success/20' : ''}>
                                    {prog.code}: {prog.status}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

type RawDataWithFr = Record<string, any> & {
    fr_subgroups?: {
        subgroups: any[];
        all: any[];
    }
};

const DetailsTabs = ({ rawData }: { rawData: RawDataWithFr | null }) => {
    const { t } = useTranslation();
    if (!rawData) return null;

    return (
    <div className="mt-4 pt-4 border-t">
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full flex flex-wrap gap-1">
                <TabsTrigger value="overview">{t('fr.htsCard.tabOverview')}</TabsTrigger>
                
                {Array.isArray(rawData.fr_subgroups?.subgroups) && rawData.fr_subgroups.subgroups.reduce((sum, sg) => sum + (sg?.count || 0), 0) > 0 && (
                  <TabsTrigger value="all">{t('fr.htsCard.tabAll', { count: rawData.fr_subgroups?.all?.length || 0 })}</TabsTrigger>
                )}
                {Array.isArray(rawData.fr_subgroups?.subgroups) && rawData.fr_subgroups.subgroups.filter(sg => (sg?.count || 0) > 0).map((sg: any) => (
                  <TabsTrigger key={sg.tag} value={sg.tag}>{sg.label} ({sg.count})</TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
                <OverviewTab details={rawData.get_hts_details} />
            </TabsContent>

            {Array.isArray(rawData.fr_subgroups?.all) && rawData.fr_subgroups.all.length > 0 && (
              <TabsContent value="all" className="mt-4">
                <FrDocsList docs={rawData.fr_subgroups.all} />
              </TabsContent>
            )}

            {Array.isArray(rawData.fr_subgroups?.subgroups) && rawData.fr_subgroups.subgroups.filter(sg => (sg?.count || 0) > 0).map((sg: any) => (
              <TabsContent key={sg.tag} value={sg.tag} className="mt-4">
                <FrDocsList docs={sg.documents || []} />
              </TabsContent>
            ))}
        </Tabs>
    </div>
    );
};

const StoryBullets = ({ item, detailedData }: { item: HtsItem, detailedData: Partial<HtsItemWithDetails> | null }) => {
    const { t } = useTranslation();
    const displayData: HtsItemWithDetails = useMemo(() => ({ ...item, ...detailedData }), [item, detailedData]);

    const dutyHints = [
        displayData.extra_duties?.s232_steel && 'Sec 232 Steel',
        displayData.extra_duties?.s232_aluminum && 'Sec 232 Aluminum',
        displayData.extra_duties?.s301 && 'Sec 301',
    ].filter(Boolean);

    const investigationCount = displayData.investigations?.length || 0;

    return (
        <div className="mt-4 pt-4 border-t border-dashed">
            <h4 className="text-base font-semibold text-foreground mb-3">{t('fr.htsCard.storyHeading')}</h4>
            <div className="grid gap-3 text-sm leading-6">
                <div className="flex items-start gap-3">
                    <Database className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>
                        <strong>{t('fr.htsCard.basicRates')} </strong>
                        {t('fr.htsCard.basicRatesDesc', {
                            general: displayData.general || '—',
                            other: displayData.other || '—',
                            units: displayData.units?.length ? displayData.units.join(', ') : t('status.empty')
                        })}
                    </span>
                </div>
                {dutyHints.length > 0 && (
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                        <span>
                            <strong>{t('fr.htsCard.extraDuties')} </strong>
                            {t('fr.htsCard.extraDutiesDesc', { duties: dutyHints.join('、') })}
                        </span>
                    </div>
                )}
                {investigationCount > 0 && (
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-warning flex-shrink-0" />
                        <span>
                            <strong>{t('fr.htsCard.tradeRemedy')} </strong>
                            {t('fr.htsCard.tradeRemedyDesc', { count: investigationCount })}
                        </span>
                    </div>
                )}
                {(displayData.effectiveDate || displayData.endDate) && (
                    <div className="flex items-start gap-3">
                        <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span>
                            <strong>{t('fr.htsCard.validPeriod')} </strong>
                            <span className="font-mono text-muted-foreground ml-1">{displayData.effectiveDate?.split(' ')[0] || 'N/A'}</span>
                            <span className="mx-1">~</span>
                            <span className="font-mono text-muted-foreground">{displayData.endDate?.split(' ')[0] || 'N/A'}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};




export const HtsResultCard = ({ item, allItems, searchTerm }: { item: HtsItem; allItems: HtsItem[]; searchTerm: string; }) => {
    const { htsResults, searchHtsCode } = useSearch();
    const { addNotification } = useNotifier();
    const { t } = useTranslation();

    // State for on-demand fetching of detailed data
    const [detailedData, setDetailedData] = useState<Partial<HtsItemWithDetails> | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    
    // 新增狀態，用於偵錯：儲存所有 API 返回的原始資料
    const [rawResponses, setRawResponses] = useState<Record<string, any> | null>(null);

    // Persist per-HTS details visibility across tab switches; default closed until user opens
    const [isDetailsVisible, setIsDetailsVisible] = useState<boolean>(() => {
        try {
            const k = `hts_card_open_${(item.htsno || '').replace(/\./g,'')}`;
            const v = sessionStorage.getItem(k);
            return v ? v === '1' : false;
        } catch { return false; }
    });

    // Restore cached detail payload if available when visible
    useEffect(() => {
        try {
            if (!isDetailsVisible) return;
            const dataKey = `hts_card_data_${(item.htsno || '').replace(/\./g,'')}`;
            const raw = sessionStorage.getItem(dataKey);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved?.detailedData) setDetailedData(saved.detailedData);
                if (saved?.rawResponses) setRawResponses(saved.rawResponses);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-implement the original client-side logic to check for 232-related footnotes.

    const highlight = (text: string) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\\\]{}]/g, '\\$&'), 'gi');
        return text.replace(regex, `<mark class="bg-muted px-1 rounded-sm">${searchTerm}</mark>`);
    };

    const renderDescription = (text: string) => {
        const highlighted = highlight(text);
        const formatted = highlighted.replace(/&lt;il&gt;/g, '<em>').replace(/&lt;\/il&gt;/g, '</em>');
        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    const htsGovDescription = item.description || '';
    const datawebDescription = (detailedData as any)?.description || '';
    const showBothDescriptions = detailedData && datawebDescription && datawebDescription !== htsGovDescription;


    const handleHtsLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        searchHtsCode(item.htsno);
    };
    const handleToggleDetails = async () => {
        const nextVisibility = !isDetailsVisible;
        setIsDetailsVisible(nextVisibility);
        try {
            const k = `hts_card_open_${(item.htsno || '').replace(/\./g,'')}`;
            sessionStorage.setItem(k, nextVisibility ? '1' : '0');
        } catch {}
        if (nextVisibility && !detailedData && !isDetailLoading) {
            setIsDetailLoading(true);
            setDetailError(null);
            setRawResponses(null); // 保留 debug 線索
            const normalizeHtsTerm = (hts: string): string => {
                const digits = String(hts || '').replace(/\D/g, '');
                let target = digits;
                if (digits.length >= 12) {
                    if (digits.endsWith('000000')) {
                        target = digits.slice(0, 6);
                    } else if (digits.endsWith('0000')) {
                        target = digits.slice(0, 8);
                    } else if (digits.endsWith('00')) {
                        target = digits.slice(0, 10);
                    }
                } else if (digits.length === 10) {
                    if (digits.endsWith('00')) {
                        target = digits.slice(0, 8);
                    }
                }

                if (target.length >= 4) {
                    let parts = [target.slice(0, 4)];
                    if (target.length >= 6) parts.push(target.slice(4, 6));
                    if (target.length >= 8) parts.push(target.slice(6, 8));
                    if (target.length >= 10) parts.push(target.slice(8, 10));
                    if (target.length >= 12) parts.push(target.slice(10, 12));
                    return parts.join('.');
                }
                return hts;
            };

            const rawDataForDebug: Record<string, any> = {};
            const persistDebugPayload = (dataForCache: Partial<HtsItemWithDetails> | null) => {
                setRawResponses(rawDataForDebug);
                try {
                    const dataKey = `hts_card_data_${(item.htsno || '').replace(/\./g,'')}`;
                    sessionStorage.setItem(dataKey, JSON.stringify({ detailedData: dataForCache, rawResponses: rawDataForDebug }));
                } catch {}
            };

            try {
                const fullHtsCode = item.htsno;
                const normalizedDotFormattedTerm = normalizeHtsTerm(fullHtsCode);
                const normalizedDigitsOnly = normalizedDotFormattedTerm.replace(/\./g, '');
                const detailsPayload = await fetchHtsDetails(normalizedDigitsOnly);
                if ((detailsPayload as any)?.error) {
                    throw new Error((detailsPayload as any).error);
                }

                rawDataForDebug['get_hts_details'] = detailsPayload;
                setDetailedData(detailsPayload as Partial<HtsItemWithDetails>);
                try {
                    const tsAll = await searchDocuments({ term: normalizedDotFormattedTerm, per_page: 10000, includeHeaders: false, skipCache: true });
                    const allDocs: any[] = normalizeResults(tsAll.payload) as any[];
                    type GroupVal = { slug: string; name: string; documents: any[]; subgroups: Map<string, any[]> };
                    const agencyMap = new Map<string, GroupVal>();
                    const order = ['sec232','sec301','trq','sec201','cvd','general','ad','other'];
                    const tagLabel: Record<string,string> = { sec232: 'Sec. 232', sec301: 'Sec. 301', trq:'TRQ', sec201:'Sec. 201', cvd:'CVD', general:'General Tariffs', ad:'AD', other:'Other' };
                    const subMap = new Map<string, any[]>();
                    const classify = (absOrig: string): string => {
                        const s = String(absOrig || '');
                        const l = s.toLowerCase();
                        if (l.includes('section 232')) return 'sec232';
                        if (l.includes('section 301')) return 'sec301';
                        if (l.includes('tariff rate quota')) return 'trq';
                        if (l.includes('section 201')) return 'sec201';
                        if (l.includes('countervailing duty') || /\bCVD\b/i.test(s)) return 'cvd';
                        if (l.includes('general tariffs')) return 'general';
                        if (l.includes('antidumping') || /\bAD\b/i.test(s)) return 'ad';
                        return 'other';
                    };

                    for (const d of allDocs) {
                        const absOrig = String((d as any)?.abstract || '');
                        const tag = classify(absOrig);
                        const sArr = subMap.get(tag) || [];
                        sArr.push(d);
                        subMap.set(tag, sArr);
                        const agencies = Array.isArray((d as any)?.agencies) ? (d as any).agencies : [];

                        if (agencies.length) {
                            for (const a of agencies) {
                                const key = String(a?.slug || a?.name || a?.raw_name || '').toLowerCase() || '(unknown)';
                                if (!agencyMap.has(key)) agencyMap.set(key, { slug: a?.slug || key, name: a?.name || a?.raw_name || key, documents: [], subgroups: new Map() });
                                const g = agencyMap.get(key)!;
                                g.documents.push(d);
                                const arr = g.subgroups.get(tag) || [];
                                arr.push(d);
                                g.subgroups.set(tag, arr);
                            }
                        } else {
                            const key = '(unclassified)';
                            if (!agencyMap.has(key)) agencyMap.set(key, { slug: key, name: 'Unclassified', documents: [], subgroups: new Map() });
                            const g = agencyMap.get(key)!;
                            g.documents.push(d);
                            const arr = g.subgroups.get(tag) || [];
                            arr.push(d);
                            g.subgroups.set(tag, arr);
                        }
                    }

                    const groups = Array.from(agencyMap.values()).map(g => {
                        const subs = Array.from(g.subgroups.entries()).map(([t, docs]) => ({ tag: t, label: tagLabel[t] || t, count: docs.length, documents: docs }));
                        subs.sort((a,b) => (order.indexOf(a.tag) - order.indexOf(b.tag)) || (b.count - a.count));
                        return { slug: g.slug, name: g.name, count: g.documents.length, documents: g.documents, subgroups: subs };
                    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

                    rawDataForDebug['fr_agencies'] = { groups };
                    const subgroups = Array.from(subMap.entries()).map(([t, docs]) => ({ tag: t, label: tagLabel[t] || t, count: docs.length, documents: docs }))
                        .filter(sg => (sg.count || 0) > 0)
                        .sort((a,b) => (order.indexOf(a.tag) - order.indexOf(b.tag)) || (b.count - a.count));
                    rawDataForDebug['fr_subgroups'] = { total: allDocs.length, all: allDocs, subgroups };
                } catch (tsError) {
                    console.error('Failed to load Federal Register documents', tsError);
                }

                persistDebugPayload((detailsPayload as Partial<HtsItemWithDetails>) ?? null);
            } catch (e: any) {
                const msg = e?.message || t('fr.htsCard.detailLoadFailed');
                if (!rawDataForDebug['get_hts_details']) {
                    rawDataForDebug['get_hts_details'] = { error: msg };
                }
                setDetailError(msg);
                addNotification(msg, 'error');
                persistDebugPayload(detailedData ?? null);
            } finally {
                setIsDetailLoading(false);
            }
        }
    };

    // Combine initial item data with detailed data once it's fetched
    const displayItem = useMemo(() => {
        if (detailedData) {
            // Prioritize detailed data, but keep some initial fields as fallbacks
            return { ...item, ...detailedData };
        }
        return item;
    }, [item, detailedData]);

    // Logic copied from HTSDetailsCard to generate applicable regulation badges
    const applicableBadges = useMemo(() => {
        const badges: { label: string; severity: 'high' | 'medium', title: string }[] = [];
        const data = displayItem as any;

        if (data.extra_duties?.s232_steel) {
            badges.push({ label: 'Sec 232 Steel', severity: 'high', title: 'Section 232 tariffs on steel might apply.' });
        }
        if (data.extra_duties?.s232_aluminum) {
            badges.push({ label: 'Sec 232 Aluminum', severity: 'high', title: 'Section 232 tariffs on aluminum might apply.' });
        }
        if (data.extra_duties?.s301) {
            badges.push({ label: 'Sec 301', severity: 'high', title: 'Section 301 tariffs on goods from China might apply.' });
        }

        const investigationTypes = new Set<string>();
        (data.investigations || []).forEach((inv: any) => {
            (inv.types || [inv.type]).filter(Boolean).forEach((type: string) => investigationTypes.add(type));
        });

        investigationTypes.forEach(type => badges.push({ label: type, severity: 'medium', title: `This HTS code is subject to ${type} investigations.` }));
        return badges;
    }, [displayItem]);

    // Replicate the logic from HTSDetailsCard to format special programs text
    const specialRateText = useMemo(() => {
        const programs = (displayItem as any).programs;
        if (Array.isArray(programs) && programs.length > 0) {
            const rate = programs[0].rate_text || 'Free'; // Default to 'Free' if rate_text is missing
            const codes = programs.map(p => p.code).join(', ');
            return `${rate} (${codes})`;
        }
        // Fallback to the raw special string if no structured programs are available
        return (displayItem as any).raw?.special || displayItem.special;
    }, [displayItem]);

    return (
        <div className="border rounded-lg p-4 my-2 bg-card text-card-foreground shadow-sm">
            {/* Indentation is now handled by the tree structure padding */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3 flex-wrap">
                                 <p className="font-mono text-lg tracking-wider">
                                    <a
                                        className="text-primary hover:text-primary/80 hover:underline"
                                        href={`https://hts.usitc.gov/search?query=${encodeURIComponent(item.htsno)}`}
                                        onClick={handleHtsLinkClick}
                                        title={t('fr.htsCard.htsLinkHint', { code: item.htsno })}
                                    >
                                        {item.htsno}
                                        {item.statisticalSuffix && <span className="text-muted-foreground">.{item.statisticalSuffix}</span>}
                                    </a>
                                </p>
                                {applicableBadges.map(badge => (
                                    <Badge key={badge.label} variant={badge.severity === 'high' ? 'destructive' : 'secondary'}>
                                        {badge.label}
                                    </Badge>
                                ))}
                            </div>
                            <div className="text-foreground mt-2 text-base space-y-2">
                                {showBothDescriptions ? (
                                    <>
                                        <div className="flex items-start">
                                            <Badge variant="outline" className="mr-2 mt-1 flex-shrink-0">HTS.gov</Badge>
                                            <span>{renderDescription(htsGovDescription)}</span>
                                        </div>
                                        <div className="flex items-start">
                                            <Badge variant="outline" className="mr-2 mt-1 flex-shrink-0">DataWeb</Badge>
                                            <span>{renderDescription(datawebDescription)}</span>
                                        </div>
                                    </>
                                ) : renderDescription(htsGovDescription)}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleToggleDetails}>
                            {isDetailsVisible ? t('fr.htsCard.hideDocDetail') : t('fr.htsCard.showDocDetail')}
                        </Button>
                    </div>
                    
                    {/* 資料敘事區塊 */}
                    <StoryBullets item={item} detailedData={detailedData} />

                    {/* Always show the basic rates from the initial search */}
                    <div className="mt-4 pt-4 border-t border-dashed border-border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div><p className="font-medium text-muted-foreground mb-1">{t('fr.htsCard.rateLabelGeneral')}</p><p className="text-foreground font-semibold text-base">{item.general || '—'}</p></div>
                            <div><p className="font-medium text-muted-foreground mb-1">{t('fr.htsCard.rateLabelSpecial')}</p><p className="text-foreground font-semibold text-base">{item.special || '—'}</p></div>
                            <div><p className="font-medium text-muted-foreground mb-1">{t('fr.htsCard.rateLabelOther')}</p><p className="text-foreground font-semibold text-base">{item.other || item.col2 || '—'}</p></div>
                        </div>
                    </div>

                    {/* Always show footnotes from the initial search */}
                    {item.footnotes && item.footnotes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-border">
                            <p className="font-medium text-muted-foreground text-base mb-2">{t('fr.htsCard.footnoteHeading')}</p>
                    {item.footnotes.map((f: HtsFootnote, fIndex: number) => {
                                const is232Footnote = f.value?.includes('232') || f.value?.includes('9903.');
                                const htsMatches: string[] = f.value?.match(/99\d{2}\.\d{2}\.\d{2}/g) || [];
                                return (
                                    <div key={fIndex} className="footnote-container relative mt-2">
                                        <div className={`text-sm ${is232Footnote ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            <span className="font-semibold">{f.columns.join(', ')}:</span>
                                            {is232Footnote && ' ・ '}
                                            {f.value.split(/(99\d{2}\.\d{2}\.\d{2})/g).map((part: string, pIndex: number) => (
                                                htsMatches.includes(part) ? (
                                                    <Popover key={`fn-${fIndex}-match-${pIndex}-${part}`}>
                                                        <PopoverTrigger asChild>
                                                            <button className="text-primary hover:text-primary/80 font-semibold hover:underline p-0 h-auto bg-transparent border-none" onClick={e => e.preventDefault()}>
                                                                {part}
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent><FootnoteDetails htsCode={part} /></PopoverContent>
                                                    </Popover>
                                                ) : (<React.Fragment key={`fn-${fIndex}-text-${pIndex}`}>{part}</React.Fragment>)
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {isDetailsVisible && (
                        isDetailLoading ? (
                            <div className="mt-4 pt-4 border-t border-dashed border-border">
                                <Skeleton className="h-5 w-1/2" />
                            </div>
                        ) : (
                            <>
                                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                                    <div>{t('fr.htsCard.indent')}: {item.indent || '0'}</div>
                                    {item.units?.length > 0 && <div>{t('fr.htsCard.units')}: {item.units.join(', ')}</div>}
                                </div>
                            <div className="mt-4 pt-4 border-t border-dashed border-border">
                                {detailError ? (
                                    <div className="text-destructive text-sm">{detailError}</div>
                                ) : (
                                    // 僅保留尚未移動到「總覽」分頁的資訊，例如分階段稅率
                                    ((displayItem as any).staged_rates?.length > 0) && (
                                        <div className="mt-4 pt-4 border-t">
                                            <h4 className="text-base font-semibold text-foreground mb-3">{t('fr.htsCard.otherCompliance')}</h4>
                                                {(displayItem as any).staged_rates && (displayItem as any).staged_rates.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="font-medium text-muted-foreground">{t('fr.htsCard.stagedRates')}:</p>
                                                        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                            {(displayItem as any).staged_rates.map((rate: any, i: number) => (
                                                                <li key={i}>{rate.year}: {rate.rate_text}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                        </div>
                                    )
                                )}
                            </div>
                            </>
                        )
                    )}

                    {/* 偵錯模式：顯示所有 API 的原始回應 */}
                    {isDetailsVisible && rawResponses && (
                        <div className="mt-4 pt-4 border-t">
                            <CollapsibleJson title="API Raw Responses (Debug Mode)" data={rawResponses} />
                        </div>
                    )}

                    {/* 渲染新的分頁式詳細資訊 */}
                    {isDetailsVisible && <DetailsTabs rawData={rawResponses} />}
        </div>
    );
};
