import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CollapsibleJson } from '@/components/ui/CollapsibleJson';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileSearch } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { formatExcerpt, NormalizedFRDoc } from '@/lib/frNormalize';
import { useFrDocumentsQuery } from '@/hooks/queries/useFrDocumentsQuery';
import { DocumentDetails } from '@/components/fr/DocumentDetails';
import { fetchNormalizedFrDoc } from '@/lib/frDocDetail';
import { useTranslation } from 'react-i18next';

type FRDoc = NormalizedFRDoc;

const formatHtsWithDots = (raw: string | undefined | null) => {
  const input = String(raw || '').trim();
  if (!input) return '';
  if (input.includes('.')) return input.replace(/\.{2,}/g, '.');
  const digits = input.replace(/\D/g, '');
  if (digits.length < 4) return input;
  const parts: string[] = [];
  parts.push(digits.slice(0, 4));
  if (digits.length >= 6) parts.push(digits.slice(4, 6));
  if (digits.length >= 8) parts.push(digits.slice(6, 8));
  if (digits.length >= 10) parts.push(digits.slice(8, 10));
  if (digits.length >= 12) parts.push(digits.slice(10, 12));
  return parts.join('.');
};

export function RelatedFRCard({ hts, rawHts, defaultPerPage = 5 }: { hts: string; rawHts?: string; defaultPerPage?: number }) {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [adapterMode, setAdapterMode] = React.useState<string>('');
  const [xCache, setXCache] = React.useState<string>('');
  const [fetchUrl, setFetchUrl] = React.useState<string>('');
  const [expandedDoc, setExpandedDoc] = React.useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = React.useState<FRDoc | null>(null);
  const [expandedRaw, setExpandedRaw] = React.useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = React.useState(false);
  const [expandedError, setExpandedError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  // Controls
  const [perPage, setPerPage] = React.useState<number>(defaultPerPage);
  const [customKeyword, setCustomKeyword] = React.useState<string>('');
  // Fixed to TS endpoints; mode selector removed
  const [debug, setDebug] = React.useState<boolean>(false);

  const searchTerm = React.useMemo(
    () => {
      const base = debug ? rawHts : hts;
      const dotted = formatHtsWithDots(base);
      return [dotted || '', customKeyword || ''].filter(Boolean).join(' ').trim();
    },
    [hts, rawHts, customKeyword, debug]
  );

  const frQuery = useFrDocumentsQuery({
    term: searchTerm,
    perPage,
    debug,
    skipCache: true,
    enabled: true,
  });

  const docs = (frQuery.data?.docs as FRDoc[]) || [];
  const loading = frQuery.isLoading;
  const error = frQuery.error
    ? frQuery.error instanceof Error
      ? frQuery.error.message
      : String(frQuery.error)
    : null;

  React.useEffect(() => {
    if (frQuery.data) {
      setFetchUrl(frQuery.data.fetchUrl);
      setAdapterMode(frQuery.data.headers['x-adapter-mode'] || '');
      setXCache(frQuery.data.headers['x-cache'] || '');
    }
  }, [frQuery.data]);

  React.useEffect(() => {
    setExpandedDoc(null);
    setExpandedDetail(null);
    setExpandedError(null);
    setExpandedRaw(null);
  }, [searchTerm, perPage, debug]);

  const handleRefresh = React.useCallback(() => {
    setExpandedDoc(null);
    setExpandedDetail(null);
    setExpandedError(null);
    setExpandedRaw(null);
    void frQuery.refetch();
  }, [frQuery]);

  const loadDoc = async (documentNumber: string) => {
    if (!documentNumber) return;
    setExpandedLoading(true);
    setExpandedError(null);
    setExpandedDetail(null);
    setExpandedRaw(null);
    try {
      const result = await fetchNormalizedFrDoc(queryClient, documentNumber);
      setFetchUrl(result.url);
      setExpandedRaw(result.raw);
      if (result.normalized) {
        setExpandedDetail(result.normalized as FRDoc);
      } else {
        setExpandedError('No document details available');
      }
    } catch (e: any) {
      setExpandedError(e?.message || 'Failed to load document details');
    } finally {
      setExpandedLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{tAny('relatedFr.title')}</CardTitle>
          <div className="flex items-center gap-2">
            {adapterMode && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground" title="Adapter Mode">{adapterMode}{xCache ? ` | ${xCache}` : ''}</span>
            )}
            <Button onClick={handleRefresh} variant="link" size="sm" className="h-auto p-0 text-xs" title={fetchUrl || ''}>{tAny('actions.refresh')}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1">
            <Label htmlFor="fr-keyword" className="text-xs">{tAny('relatedFr.keyword')}</Label>
            <Input id="fr-keyword" value={customKeyword} onChange={e => setCustomKeyword(e.target.value)} placeholder={tAny('relatedFr.keywordPlaceholder')} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            {/* Mode selector removed; fixed to TS endpoint */}
            <Label htmlFor="fr-perpage" className="text-xs">{tAny('relatedFr.perPage')}</Label>
            <Select value={String(perPage)} onValueChange={(v: string) => setPerPage(parseInt(v, 10) || defaultPerPage)}>
              <SelectTrigger id="fr-perpage" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="frcard-debug" checked={debug} onCheckedChange={(checked: boolean) => setDebug(Boolean(checked))} />
            <Label htmlFor="frcard-debug" className="text-xs font-normal">{tAny('relatedFr.debug')}</Label>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          {tAny('relatedFr.queryLine', {
            term: (formatHtsWithDots(debug ? rawHts : hts) || tAny('relatedFr.emptyTerm')),
            keyword: customKeyword ? ` ${customKeyword}` : '',
            perPage
          })}
        </div>
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_,i) => (
              <div key={i} className="animate-pulse h-12 bg-muted rounded" />
            ))}
          </div>
        )}
        {error && <div className="text-destructive">{error}</div>}
        {!loading && !error && docs.length === 0 && (
          <EmptyState
            icon={<FileSearch className="h-10 w-10" />}
            title={tAny('relatedFr.emptyTitle')}
            description={tAny('relatedFr.emptyDesc')}
          />
        )}
        <TooltipProvider>
          <Accordion type="single" collapsible className="w-full">
            {docs.map((d, idx) => {
              const accordionValue = `${d.document_number}-${idx}`;
              return (
                <AccordionItem key={accordionValue} value={accordionValue} className="border rounded px-2">
                  <AccordionTrigger className="text-left px-0 hover:no-underline">
                    <div className="w-full text-left">
                      <div className="font-medium text-foreground text-sm">
                        <a href={d.html_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.title}</a>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{d.document_number} | {d.type} | {d.publication_date}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{d.agencies_text || (Array.isArray(d.agencies) ? d.agencies.map(a => (a?.name || (a as any)?.raw_name || '')).filter(Boolean).join(', ') : '')}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0">
                    {Array.isArray(d.excerpts) && d.excerpts.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-1">
                        {d.excerpts.map((ex, idx) => (
                          <div key={idx}
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: formatExcerpt(ex || '') }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        onClick={() => {
                          if (expandedDoc === d.document_number) {
                            setExpandedDoc(null);
                            setExpandedDetail(null);
                            setExpandedRaw(null);
                            setExpandedError(null);
                            return;
                          }
                          setExpandedDoc(d.document_number);
                          void loadDoc(d.document_number);
                        }}
                        variant="secondary"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                      >
                        {tAny('relatedFr.details')}
                      </Button>
                      {d.body_html_url && (
                        <a href={d.body_html_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{tAny('relatedFr.fullText')}</a>
                      )}
                      {d.pdf_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={d.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">PDF</a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-[11px]">
                              <div className="font-semibold">{tAny('relatedFr.pdfTitle')}</div>
                              <div>{tAny('relatedFr.pdfDesc1')}</div>
                              <div>{tAny('relatedFr.pdfDesc2')}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {d.public_inspection_pdf_url && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a href={d.public_inspection_pdf_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{tAny('relatedFr.piPdf')}</a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-[11px]">
                              <div className="font-semibold">{tAny('relatedFr.piPdfTitle')}</div>
                              <div>{tAny('relatedFr.piPdfDesc1')}</div>
                              <div>{tAny('relatedFr.piPdfDesc2')}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {expandedDoc === d.document_number && (
                      <div className="mt-2 text-xs bg-muted/50 p-2 rounded border">
                        {expandedLoading && <div>{tAny('relatedFr.loadingDetail')}</div>}
                        {expandedError && <div className="text-destructive">{expandedError}</div>}
                        {!expandedLoading && !expandedError && expandedDetail && (
                          <DocumentDetails doc={expandedDetail} />
                        )}
                        {!expandedLoading && !expandedError && !expandedDetail && !expandedRaw && (
                          <div>{tAny('relatedFr.noDetail')}</div>
                        )}
                        {debug && expandedRaw && (
                          <div className="mt-2">
                            <CollapsibleJson title={tAny('relatedFr.rawJson')} data={expandedRaw} />
                          </div>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TooltipProvider>

      </CardContent>
    </Card>
  );
}
