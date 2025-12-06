import React from 'react';
import { useTranslation } from "react-i18next";
import { FacetCard } from "./FacetCard";

type FacetItem = { name?: string; slug?: string; count?: number };
type FacetGroup = { year: string; items: FacetItem[]; yearCount?: number };
type FacetResult = { attributes?: FacetItem } | FacetItem;
type FacetsObject = Record<string, { results?: FacetResult[] } | undefined>;

export function FacetsGrid(props: {
  rowKeys: string[];
  facetsObj: FacetsObject;
  getFacetSelectedCount: (name: string) => number;
  onClear: (name: string) => void;
  facetOpen: Record<string, boolean>;
  setFacetOpen: (updater: (s: Record<string, boolean>) => Record<string, boolean>) => void;
  facetPage: Record<string, number>;
  facetTotalPages: Record<string, number>;
  facetItems: Record<string, FacetItem[]>;
  facetLoading: Record<string, boolean>;
  facetAutoClose: boolean;
  setFacetAutoClose: (v: boolean) => void;
  loadFacetPage: (fname: string, page: number) => void;
  onSelectItem: (fname: string, name: string, slug?: string) => void;
  groupByYear: (items: FacetItem[]) => Array<FacetGroup>;
}) {
  const {
    rowKeys, facetsObj, getFacetSelectedCount, onClear,
    facetOpen, setFacetOpen, facetPage, facetTotalPages, facetItems, facetLoading,
    facetAutoClose, setFacetAutoClose, loadFacetPage, onSelectItem, groupByYear,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {rowKeys.map((fname) => {
        const f = facetsObj?.[fname];
        const items: FacetItem[] = ((f?.results || []) as FacetResult[]).map((x) => (x as any)?.attributes ?? (x as FacetItem));
        const label = t(`fr.facet.names.${fname}`, { defaultValue: fname });
        return (
          <FacetCard
            key={fname}
            name={label}
            selectedCount={getFacetSelectedCount(fname)}
            onClear={() => onClear(fname)}
            popover={{
              open: !!facetOpen[fname],
              onOpenChange: (o: boolean) => {
                setFacetOpen((s) => ({ ...s, [fname]: o }));
                if (o) {
                  const pg = facetPage[fname] || 1;
                  loadFacetPage(fname, pg);
                  if (fname === 'quarterly') {
                    const yg = facetPage['yearly'] || 1;
                    loadFacetPage('yearly', yg);
                  }
                }
              },
              loading: !!facetLoading[fname],
              page: facetPage[fname] || 1,
              totalPages: facetTotalPages[fname] || 1,
              onPrev: () => loadFacetPage(fname, Math.max(1, (facetPage[fname] || 1) - 1)),
              onNext: () => loadFacetPage(fname, (facetPage[fname] || 1) + 1),
              autoClose: facetAutoClose,
              onAutoCloseChange: (v: boolean) => setFacetAutoClose(Boolean(v)),
              groups: (() => {
                const arr: FacetItem[] = facetItems[fname] || items || [];
                if (fname === 'quarterly') {
                  const arrY: FacetItem[] = facetItems['yearly'] || [];
                  if (arrY.length) {
                    const sortedYears = [...arrY].sort((a, b) => {
                      const ay = Number(String(a?.name || a?.slug || '').match(/(19|20)\d{2}/)?.[0] || 0);
                      const by = Number(String(b?.name || b?.slug || '').match(/(19|20)\d{2}/)?.[0] || 0);
                      return by - ay; // newest first
                    });
                    return sortedYears.map((y: FacetItem) => {
                      const yr = String(y?.name || y?.slug || '');
                      const yitems = (arr || []).filter((it: FacetItem) => String(it?.name || '').includes(yr) && ((it?.count ?? 0) > 0));
                      return { year: yr, items: yitems, yearCount: y?.count ?? 0 };
                    });
                  }
                  return groupByYear(arr).map((g) => ({ ...g, items: (g.items || []).filter((x: FacetItem) => (x?.count ?? 0) > 0), yearCount: (g.items || []).reduce((a: number, x: FacetItem) => a + (x?.count ?? 0), 0) }));
                }
                if (fname === 'daily' || fname === 'weekly' || fname === 'monthly') {
                  return groupByYear(arr).map((g) => ({ ...g, items: (g.items || []).filter((x: FacetItem) => (x?.count ?? 0) > 0) }));
                }
                return [{ year: '', items: (arr || []).filter((x: FacetItem) => (x?.count ?? 0) > 0) }];
              })(),
              onSelect: ({ name, slug }: { name?: string; slug?: string }) => {
                const nm = String(name || '');
                onSelectItem(fname, nm, slug);
                if (facetAutoClose) setFacetOpen((s) => ({ ...s, [fname]: false }));
              },
              onClose: () => setFacetOpen((s) => ({ ...s, [fname]: false })),
              isQuarterly: fname === 'quarterly',
            }}
          />
        );
      })}
    </div>
  );
}
