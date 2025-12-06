import React from 'react';
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CollapsibleJson } from "@/components/ui/CollapsibleJson";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { formatExcerpt } from "@/lib/frNormalize";
import type { NormalizedFRDoc } from '@/lib/frNormalize';
import { DocumentDetails } from './DocumentDetails';
import { Switch } from "@/components/ui/switch";

export type DocLite = {
  document_number: string;
  title: string;
  type?: string;
  publication_date?: string;
  agencies?: Array<{ name?: string; id?: number; slug?: string }>;
  agencies_text?: string;
  html_url?: string;
  body_html_url?: string | null;
  pdf_url?: string | null;
  public_inspection_pdf_url?: string | null;
  excerpts?: string[];
};

export function ResultsList(props: {
  results: DocLite[];
  expandedDoc: string | null;
  expandedLoading: boolean;
  expandedError: string | null;
  expandedRaw: unknown | null;
  expandedDetail: NormalizedFRDoc | null;
  onLoadDetail: (docnum: string) => void;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  paginationDisabled?: boolean;
  // Optional: integrate search-details fetch/display (query-level metadata)
  debugMode?: boolean;
  onLoadSearchDetails?: () => void | Promise<void>;
  searchDetails?: unknown | null;
  // Optional: company rates integration
  companyRatesEnabled?: boolean;
  onCompanyRatesToggle?: (value: boolean) => void;
  onShowCompanyRates?: (doc: DocLite) => void;
}) {
  const {
    results,
    expandedDoc,
    expandedLoading,
    expandedError,
    expandedRaw,
    expandedDetail,
    onLoadDetail,
    page,
    totalPages,
    totalCount,
    onPrevPage,
    onNextPage,
    paginationDisabled,
    debugMode,
    onLoadSearchDetails,
    searchDetails,
    companyRatesEnabled,
    onCompanyRatesToggle,
    onShowCompanyRates,
  } = props;
  const { t } = useTranslation();
  const [accordionValue, setAccordionValue] = React.useState<string>(expandedDoc || '');
  React.useEffect(() => {
  setAccordionValue(expandedDoc || '');
}, [expandedDoc]);
  const AccordionTrigger = AccordionPrimitive.Trigger;
  const showPagination = typeof page === 'number' || typeof totalPages === 'number' || typeof totalCount === 'number' || onPrevPage || onNextPage;
  const pageLabel = totalPages
    ? t('fr.pageWithTotal', { page: page || 1, totalPages })
    : t('fr.page', { page: page || 1 });
  const countLabel = t('fr.totalCount', { count: typeof totalCount === 'number' ? totalCount : results.length });
  const prevDisabled = paginationDisabled || !onPrevPage || (typeof page === 'number' ? page <= 1 : false);
  const nextDisabled = paginationDisabled || !onNextPage || (typeof totalPages === 'number' && typeof page === 'number' ? (totalPages > 0 && page >= totalPages) : false);
  const showCompanyRatesControls = typeof onCompanyRatesToggle === 'function';
  return (
    <div>
      {showPagination && (
        <div className="flex items-center gap-2 text-sm flex-wrap md:flex-nowrap gap-y-2 mb-3">
          {onPrevPage && (
            <Button variant="secondary" size="sm" className="h-auto px-2 py-1" disabled={prevDisabled} onClick={onPrevPage}>
              {t('fr.prev')}
            </Button>
          )}
          {onNextPage && (
            <Button variant="secondary" size="sm" className="h-auto px-2 py-1" disabled={nextDisabled} onClick={onNextPage}>
              {t('fr.next')}
            </Button>
          )}
          <span>{pageLabel}</span>
          <span className="text-xs text-muted-foreground">{countLabel}</span>
          <span className="font-semibold text-sm">{t('fr.results.title', { count: results.length })}</span>
          {showCompanyRatesControls && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('fr.results.companyRatesToggle')}</span>
              <Switch checked={Boolean(companyRatesEnabled)} onCheckedChange={(v: boolean) => onCompanyRatesToggle?.(Boolean(v))} />
            </div>
          )}
        </div>
      )}
      {!showPagination && <div className="font-semibold text-sm mb-2">{t('fr.results.title', { count: results.length })}</div>}
      {results.length === 0 && <div className="text-xs text-muted-foreground">{t('fr.results.empty')}</div>}
      <TooltipProvider>
        <Accordion
          type="single"
          collapsible
          className="w-full divide-y"
          value={accordionValue}
          onValueChange={(v) => setAccordionValue(v || '')}
        >
          {results.map((d) => (
            <AccordionItem key={d.document_number} value={d.document_number} className="py-2">
              <AccordionTrigger asChild className="text-left px-0 items-start w-full">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="text-left">
                    <div className="font-medium text-sm">
                      {d.html_url ? (
                        <a href={d.html_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.title}</a>
                      ) : (
                        <span>{d.title}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.document_number} | {d.type || ''} | {d.publication_date || ''}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {d.agencies_text || (Array.isArray(d.agencies) ? d.agencies.map(a => (a?.name || (a as any)?.raw_name || '')).filter(Boolean).join(', ') : '')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccordionValue(d.document_number);
                          onLoadDetail(d.document_number);
                        }}
                        variant="secondary"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                      >
                        {t('fr.results.details')}
                      </Button>
                      {debugMode && onLoadSearchDetails && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadSearchDetails();
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                        >
                          {t('fr.results.searchDetails')}
                        </Button>
                      )}
                      {companyRatesEnabled && onShowCompanyRates && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowCompanyRates(d);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                        >
                          {t('fr.results.companyRatesButton')}
                        </Button>
                      )}
                      {d.body_html_url && (
                        <a
                          href={d.body_html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('fr.results.fullText')}
                        </a>
                      )}
                    </div>
                    {d.public_inspection_pdf_url && (
                      <div className="flex items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={d.public_inspection_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('fr.results.publicInspection')}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-[11px]">
                              <div className="font-semibold">{t('fr.results.publicInspectionTitle')}</div>
                              <div>{t('fr.results.publicInspectionDesc1')}</div>
                              <div>{t('fr.results.publicInspectionDesc2')}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                    {d.pdf_url && (
                      <div className="flex items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={d.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('fr.results.pdf')}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-[11px]">
                              <div className="font-semibold">{t('fr.results.pdfTitle')}</div>
                              <div>{t('fr.results.pdfDesc1')}</div>
                              <div>{t('fr.results.pdfDesc2')}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
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
                {expandedDoc === d.document_number && (
                  <div className="mt-2 text-xs bg-muted/50 p-2 rounded border w-full">
                    {expandedLoading && <div>{t('fr.results.loadingDetail')}</div>}
                    {expandedError && <div className="text-destructive">{expandedError}</div>}
                    {!expandedLoading && !expandedError && expandedDetail && expandedDetail.document_number === d.document_number && (
                      <DocumentDetails doc={expandedDetail} />
                    )}
                    {!expandedLoading && !expandedError && (!expandedDetail || expandedDetail.document_number !== d.document_number) && (
                      <div className="text-muted-foreground">{t('fr.results.noDetail')}</div>
                    )}
                    {debugMode && expandedRaw ? (
                      <div className="mt-2">
                        <CollapsibleJson title={t('fr.results.docRaw')} data={expandedRaw as any} />
                      </div>
                    ) : null}
                    {debugMode && searchDetails ? (
                      <div className="mt-2">
                        <CollapsibleJson title={t('fr.results.searchDetailsDebug')} data={searchDetails as any} />
                      </div>
                    ) : null}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TooltipProvider>

    </div>
  );
}
