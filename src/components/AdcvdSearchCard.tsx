import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAdcvdOrdersQuery, type AdcvdResponse, type AdcvdResult } from '@/hooks/queries/useAdcvdOrdersQuery';
import { useFederalRegisterSearchQuery } from '@/hooks/queries/useFederalRegisterSearchQuery';
import { ResultsList, type DocLite } from '@/components/fr/ResultsList';
import type { NormalizedFRDoc } from '@/lib/frNormalize';
import { fetchNormalizedFrDoc } from '@/lib/frDocDetail';
import { CompanyRatesModal } from '@/components/intelligence/CompanyRatesModal';
import { useCompanyRatesQuery } from '@/hooks/queries/useCompanyRatesQuery';
import { IDSearchCard } from '@/components/IDSearchCard';
import { Accordion as UiAccordion, AccordionItem as UiAccordionItem, AccordionTrigger as UiAccordionTrigger, AccordionContent as UiAccordionContent } from '@/components/ui/accordion';

const FederalRegisterSection: React.FC<{ item: AdcvdResult }> = ({ item }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<NormalizedFRDoc | null>(null);
  const [expandedRaw, setExpandedRaw] = useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const term = useMemo(() => {
    const parts = [item.case_number, item.country, item.product].filter((p) => !!p?.trim());
    const fixed = ['Final Results', 'Administrative'];
    const tokens = [...parts, ...fixed].map((p) => `"${p}"`);
    return tokens.join(' & ').trim();
  }, [item.case_number, item.country, item.product, t]);

  const searchArgs = useMemo(() => {
    if (!term) return null;
    return {
      term,
      perPage: 10,
      page,
      order: 'recent',
      facets: [] as string[],
      conditions: {} as Record<string, any>,
      debugMode: false,
    };
  }, [term, page]);

  const frQuery = useFederalRegisterSearchQuery(searchArgs, open && Boolean(searchArgs));
  const frData = frQuery.data;
  const frDocs = frData?.docs ?? [];
  const totalPages = frData?.totalPages ?? 0;
  const totalCount = useMemo(() => {
    const p = frData?.payload as any;
    if (typeof p?.count === 'number') return p.count;
    if (typeof p?.total === 'number') return p.total;
    if (typeof p?.documents?.count === 'number') return p.documents.count;
    return frDocs.length;
  }, [frData?.payload, frDocs]);
  const frError = frQuery.error ? (frQuery.error instanceof Error ? frQuery.error.message : String(frQuery.error)) : null;
  const frLoading = frQuery.isFetching || frQuery.isLoading;

  useEffect(() => {
    setPage(1);
    setExpandedDoc(null);
  }, [term]);

  const loadDetail = async (docnum: string) => {
    if (!docnum) return;
    setExpandedDoc(docnum);
    setExpandedError(null);
    setExpandedLoading(true);
    try {
      const result = await fetchNormalizedFrDoc(queryClient, docnum);
      setExpandedDetail(result.normalized);
      setExpandedRaw(result.raw);
    } catch (err) {
      setExpandedError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpandedLoading(false);
    }
  };

  const [companyRatesEnabled, setCompanyRatesEnabled] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyDocNumber, setCompanyDocNumber] = useState<string | null>(null);
  const [companyTitle, setCompanyTitle] = useState<string | null>(null);
  const [companyPeriod, setCompanyPeriod] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [companyPeriodText, setCompanyPeriodText] = useState<string | null>(null);
  const [companyHeadingText, setCompanyHeadingText] = useState<string | null>(null);
  const [companyRows, setCompanyRows] = useState<any[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const companyRatesQuery = useCompanyRatesQuery({
    documentNumber: companyDocNumber ?? '',
    enabled: companyRatesEnabled && Boolean(companyDocNumber),
  });

  const openCompanyRates = (doc: DocLite) => {
    if (!companyRatesEnabled || !doc?.document_number) return;

    // If the same doc is opened again and we already have data cached, show it immediately
    if (companyDocNumber === doc.document_number && companyRatesQuery.data) {
      const data = companyRatesQuery.data as any;
      setCompanyTitle(data.title || doc.title || doc.document_number);
      setCompanyPeriod({ start: data.period_start || null, end: data.period_end || null });
      setCompanyPeriodText(data.period_text || null);
      setCompanyHeadingText(data.heading_text || null);
      setCompanyRows(Array.isArray(data?.rates) ? data.rates : []);
      setCompanyError(null);
      setCompanyOpen(true);
      setCompanyLoading(false);
      return;
    }

    setCompanyDocNumber(doc.document_number);
    setCompanyTitle(doc.title || doc.document_number);
    setCompanyPeriod({ start: null, end: null });
    setCompanyPeriodText(null);
    setCompanyHeadingText(null);
    setCompanyRows([]);
    setCompanyError(null);
    setCompanyOpen(true);
    setCompanyLoading(true);
  };

  useEffect(() => {
    if (!companyDocNumber) return;
    if (companyRatesQuery.isFetching) {
      setCompanyLoading(true);
      return;
    }
    setCompanyLoading(false);
    if (companyRatesQuery.error) {
      const message =
        companyRatesQuery.error instanceof Error ? companyRatesQuery.error.message : String(companyRatesQuery.error);
      setCompanyError(message);
      return;
    }
    const data = companyRatesQuery.data;
    if (!data) return;
    setCompanyPeriod({ start: (data as any).period_start || null, end: (data as any).period_end || null });
    setCompanyPeriodText((data as any).period_text || null);
    setCompanyHeadingText((data as any).heading_text || null);
    if ((data as any).title) setCompanyTitle((data as any).title);
    if ((data as any).special_case) {
      setCompanyError(t('adcvdCard.frSection.specialCaseError', { case: (data as any).special_case }));
      setCompanyRows([{ company: 'N/A', rate: (data as any).source_url || `https://www.federalregister.gov/d/${companyDocNumber}` }]);
      return;
    }
    setCompanyRows(Array.isArray((data as any)?.rates) ? (data as any).rates : []);
  }, [companyDocNumber, companyRatesQuery.data, companyRatesQuery.error, companyRatesQuery.isFetching, t]);

  return (
    <>
    <div className="mb-4">
      <UiAccordion type="single" collapsible className="w-full">
        <UiAccordionItem value="ids-search">
          <UiAccordionTrigger className="px-0 text-sm font-medium text-left">
            Investigation Search (prefilled from ADCVD case)
          </UiAccordionTrigger>
          <UiAccordionContent className="px-0">
            <IDSearchCard
              title="Investigation Search (prefilled from ADCVD case)"
              defaultOrderNumber={item.case_number || ''}
              defaultCountry={item.country || ''}
              autoSearch
            />
          </UiAccordionContent>
        </UiAccordionItem>
      </UiAccordion>
    </div>
    <Accordion
      type="single"
      collapsible
      value={open ? 'fr' : ''}
      onValueChange={(val) => setOpen(Boolean(val))}
      className="w-full"
    >
      <AccordionItem value="fr">
        <AccordionTrigger className="px-0 text-sm font-medium text-left">
          {t('adcvdCard.frSection.title')}
        </AccordionTrigger>
        <AccordionContent className="px-0">
          <div className="text-xs text-muted-foreground mb-2">
            {t('adcvdCard.frSection.searchTerms')}: <span className="font-mono break-all">{term || "N/A"}</span>
          </div>
          {frLoading && <div className="text-sm">{t('adcvdCard.frSection.loading')}</div>}
          {frError && <div className="text-sm text-destructive">{frError}</div>}
          {!frLoading && !frError && searchArgs && (
            frDocs.length > 0 ? (
              <ResultsList
                results={frDocs}
                expandedDoc={expandedDoc}
                expandedLoading={expandedLoading}
                expandedError={expandedError}
                expandedRaw={expandedRaw}
                expandedDetail={expandedDetail}
                onLoadDetail={loadDetail}
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => {
                  if (totalPages > 0) return Math.min(totalPages, p + 1);
                  return p + 1;
                })}
                paginationDisabled={frLoading}
                companyRatesEnabled={companyRatesEnabled}
                onCompanyRatesToggle={(v) => {
                  setCompanyRatesEnabled(v);
                  if (!v) {
                    setCompanyOpen(false);
                    setCompanyDocNumber(null);
                    setCompanyRows([]);
                    setCompanyError(null);
                  }
                }}
                onShowCompanyRates={openCompanyRates}
              />
            ) : (
              <div className="text-sm text-muted-foreground">{t('adcvdCard.frSection.noResults')}</div>
            )
          )}
          {!searchArgs && (
            <div className="text-sm text-muted-foreground">{t('adcvdCard.frSection.noInfo')}</div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <CompanyRatesModal
      isOpen={companyOpen}
      onClose={() => setCompanyOpen(false)}
      country={companyTitle || companyDocNumber}
      isLoading={companyLoading}
      error={companyError}
      rows={companyRows}
      title={companyTitle}
      periodStart={companyPeriod.start}
      periodEnd={companyPeriod.end}
      periodText={companyPeriodText}
      headingText={companyHeadingText}
    />
    </>
  );
};

export const AdcvdSearchCard: React.FC<{ htsCode?: string }> = ({ htsCode }) => {
  const { t } = useTranslation();
  const initialQuery = htsCode ? htsCode.replace(/\./g, '') : '';
  const [q, setQ] = useState(initialQuery);
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(1);
  const [activeQuery, setActiveQuery] = useState<string>(initialQuery);

  const offset = Math.max(0, (page - 1) * size);
  const queryEnabled = Boolean(activeQuery);
  const adcvdQuery = useAdcvdOrdersQuery({ q: activeQuery, size, offset, enabled: queryEnabled });
  const data: AdcvdResponse | null = adcvdQuery.data ?? null;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil((total || 0) / size));
  const loading = adcvdQuery.isFetching || adcvdQuery.isLoading;
  const error = adcvdQuery.error ? (adcvdQuery.error instanceof Error ? adcvdQuery.error.message : String(adcvdQuery.error)) : null;

  useEffect(() => {
    if (htsCode) {
      const htsWithoutDots = htsCode.replace(/\./g, '');
      if (htsWithoutDots !== q) {
        setQ(htsWithoutDots);
      }
      if (htsWithoutDots !== activeQuery) {
        setPage(1);
        setActiveQuery(htsWithoutDots);
      }
    }
  }, [htsCode]);

  const handleSearch = () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const queryWithoutDots = trimmed.replace(/\./g, '');
    setPage(1);
    setActiveQuery(queryWithoutDots);
  };

  // 當 page/size 變動時，由 TanStack Query 依 queryKey 自動 refetch
  useEffect(() => {
    if (!activeQuery) return;
  }, [activeQuery, page, size]);

  const results = data?.results ?? [];

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{t('adcvdCard.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('adcvdCard.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">{t('adcvdCard.queryLabel')}</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('adcvdCard.sizeLabel')}</label>
          <Input
            type="number"
            value={size}
            min={1}
            max={50}
            onChange={(e) => {
              const next = Math.min(50, Math.max(1, Number(e.target.value) || 10));
              setSize(next);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('adcvdCard.pageLabel')}</label>
          <Input
            type="number"
            value={page}
            min={1}
            max={totalPages || 1e9}
            onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={loading}>{loading ? t('adcvdCard.searching') : t('adcvdCard.search')}</Button>
          <Button variant="outline" onClick={() => { setQ(''); setPage(1); setActiveQuery(''); }}>{t('adcvdCard.reset')}</Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {t('adcvdCard.source')}:
          <a href="https://access.trade.gov/ADCVD_Search.aspx" target="_blank" rel="noreferrer" className="text-primary underline ml-1">
            https://access.trade.gov/ADCVD_Search.aspx
          </a>
        </span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {queryEnabled && !loading && !error && results.length === 0 && (
        <Alert>
          <AlertDescription>{t('adcvdCard.noData')}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-2">
            <span>{t('adcvdCard.results.summary', { total: total || results.length, count: results.length, offset })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('adcvdCard.results.prev')}
              </Button>
              <span>{t('adcvdCard.results.page', { page, totalPages })}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('adcvdCard.results.next')}
              </Button>
            </div>
          </div>
          <div className="overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('adcvdCard.table.case')}</TableHead>
                  <TableHead>{t('adcvdCard.table.country')}</TableHead>
                  <TableHead>{t('adcvdCard.table.product')}</TableHead>
                  <TableHead>{t('adcvdCard.table.hts')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item, idx) => (
                  <React.Fragment key={`${item.case_number || idx}-${idx}`}>
                    <TableRow>
                      <TableCell className="space-y-1 whitespace-nowrap">
                        {item.case_number ? (
                          <a
                            className="font-semibold text-primary hover:text-primary/80 underline"
                            href={item.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.case_number}
                          </a>
                        ) : (
                          <div className="font-semibold">—</div>
                        )}
                      </TableCell>
                      <TableCell>{item.country || '—'}</TableCell>
                      <TableCell className="space-y-1">
                        <div className="text-sm font-medium">{item.product || '—'}</div>
                        <div className="text-xs text-muted-foreground">{item.commodity || '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(item.hts_numbers || []).join(', ') || '—'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/40">
                        <FederalRegisterSection item={item} />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdcvdSearchCard;
