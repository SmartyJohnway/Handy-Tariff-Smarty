import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type Group = { year?: string; items: any[]; yearCount?: number };

export function FacetCard(props: {
  name: string;
  selectedCount: number;
  onClear: () => void;
  popover: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loading: boolean;
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    autoClose: boolean;
    onAutoCloseChange: (v: boolean) => void;
    groups: Group[];
    onSelect: (item: { name: string; slug?: string; count?: number }) => void;
    onClose: () => void;
    isQuarterly?: boolean;
  };
}) {
  const { name, selectedCount, onClear, popover } = props;
  const title = name;
  const { t } = useTranslation();
  const pageLabel = popover.totalPages
    ? t('fr.facet.pageWithTotal', { page: popover.page || 1, total: popover.totalPages })
    : t('fr.facet.page', { page: popover.page || 1 });

  return (
    <div className="border border-border rounded p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm capitalize flex items-center gap-2">
          <span>{title}</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-accent text-accent-foreground text-[10px]">
              {selectedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={selectedCount===0 && (title!=='daily' && title!=='weekly' && title!=='monthly' && title!=='quarterly')} onClick={onClear}>
            {t('fr.facet.clear')}
          </Button>
          <Popover open={popover.open} onOpenChange={popover.onOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="h-7 px-2 text-xs">{t('fr.facet.browse')}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-96 overflow-auto">
              <div className="text-xs font-medium mb-2">{title} - {pageLabel}</div>
              {popover.loading && <div className="text-xs text-muted-foreground">{t('status.loading')}</div>}
              {!popover.loading && (
                <div className="space-y-2">
                  {popover.groups.map((g, gi) => (
                    <div key={`${title}-grp-${gi}`}>
                      {g.year && (
                        popover.isQuarterly ? (
                          <button
                            className="text-sm font-medium text-muted-foreground mb-1 underline-offset-2 hover:underline"
                            onClick={() => popover.onSelect({ name: g.year || '' })}
                            title={t('fr.facet.applyYear', { year: g.year })}
                          >
                            {g.year}
                            <span className="ml-1 text-xs text-muted-foreground">({g.yearCount ?? ((g.items||[]).reduce((a:number,x:any)=>a+(x?.count??0),0))})</span>
                          </button>
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            {g.year}
                            <span className="ml-1 text-xs text-muted-foreground">({g.yearCount ?? ((g.items||[]).reduce((a:number,x:any)=>a+(x?.count??0),0))})</span>
                          </div>
                        )
                      )}
                      <div className="space-y-1">
                        {(g.items||[]).map((x: any, idx: number) => {
                          const name = x?.name || '';
                          const slug = x?.slug || name;
                          const count = x?.count ?? 0;
                          return (
                            <div
                              key={`${slug}-${idx}`}
                              className="flex items-center justify-between gap-2 text-sm h-9 rounded px-2 cursor-pointer hover:bg-accent/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                popover.onSelect({ name, slug, count });
                                if (popover.autoClose) popover.onOpenChange(false);
                              }}
                            >
                              <div className="truncate">{name}</div>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Checkbox id={`auto-${title}`} checked={popover.autoClose} onCheckedChange={(v: boolean)=>popover.onAutoCloseChange(Boolean(v))} />
                  <Label htmlFor={`auto-${title}`} className="text-xs">{t('fr.facet.autoClose')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" disabled={(popover.page||1) <= 1} onClick={popover.onPrev}>{t('fr.prev')}</Button>
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" disabled={!!popover.totalPages && (popover.page||1) >= (popover.totalPages||1)} onClick={popover.onNext}>{t('fr.next')}</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>{t('fr.facet.clear')}</Button>
                  <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={()=>{ /* debounce handled by parent */ }}>{t('fr.facet.apply')}</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={popover.onClose}>{t('actions.close')}</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
