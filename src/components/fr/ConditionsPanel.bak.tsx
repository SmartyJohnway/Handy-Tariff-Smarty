import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  condAgencyQuery: string;
  setCondAgencyQuery: (v: string) => void;
  condAgencySuggests: any[];
  condAgencySuggestOpen: boolean;
  doSuggestAgencies: (q: string) => void | Promise<void>;
  setCondAgencySuggestOpen: (v: boolean) => void;
  condAgencies: string;
  setCondAgencies: (v: string) => void;

  condTypeOptions: Array<{ slug?: string; name?: string; title?: string; count?: number }>;
  condTypeLoading?: boolean;
  condTypes: string;
  setCondTypes: (v: string) => void;

  agencyAllItems?: any[];
  agencyAllPage?: number;
  agencyAllTotalPages?: number;
  agencyAllLoading?: boolean;
  onLoadAgencyAll?: (page: number) => Promise<void> | void;

  condSectionQuery: string;
  setCondSectionQuery: (v: string) => void;
  condSectionSuggests: any[];
  condSectionSuggestOpen: boolean;
  doSuggestSections: (q: string) => void | Promise<void>;
  setCondSectionSuggestOpen: (v: boolean) => void;
  condSections: string;
  setCondSections: (v: string) => void;
  condSectionSource: Array<{ slug: string; name: string; title?: string }>;
  condSectionLoaded?: boolean;

  condTopicQuery: string;
  setCondTopicQuery: (v: string) => void;
  condTopicSuggests: any[];
  condTopicSuggestOpen: boolean;
  doSuggestTopics: (q: string) => void | Promise<void>;
  setCondTopicSuggestOpen: (v: boolean) => void;
  condTopics: string;
  setCondTopics: (v: string) => void;
  topicAllItems?: any[];
  topicAllPage?: number;
  topicAllTotalPages?: number;
  topicAllLoading?: boolean;
  onLoadTopicAll?: (page: number) => Promise<void> | void;

  onAdded: () => void;
};

export function ConditionsPanel(props: Props) {
  const {
    condAgencyQuery, setCondAgencyQuery, condAgencySuggests, condAgencySuggestOpen, doSuggestAgencies, setCondAgencySuggestOpen, condAgencies, setCondAgencies,
    condTypeOptions, condTypeLoading, condTypes, setCondTypes, agencyAllItems, agencyAllPage, agencyAllTotalPages, agencyAllLoading, onLoadAgencyAll,
    condSectionQuery, setCondSectionQuery, condSectionSuggests, condSectionSuggestOpen, doSuggestSections, setCondSectionSuggestOpen, condSections, setCondSections, condSectionSource, condSectionLoaded,
    condTopicQuery, setCondTopicQuery, condTopicSuggests, condTopicSuggestOpen, doSuggestTopics, setCondTopicSuggestOpen, condTopics, setCondTopics, topicAllItems, topicAllPage, topicAllTotalPages, topicAllLoading, onLoadTopicAll,
    onAdded,
  } = props;
  const { t } = useTranslation();
  const hint = t('fr.conditions.hint');
  const noName = t('fr.conditions.noName');
  const noSlug = t('fr.conditions.noSlug');
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [sectionOpen, setSectionOpen] = React.useState(false);
  const [agencyAllOpen, setAgencyAllOpen] = React.useState(false);
  const [topicAllOpen, setTopicAllOpen] = React.useState(false);

  const toggleCsv = (csv: string, value: string) => {
    const parts = csv.split(',').map((s) => s.trim()).filter(Boolean);
    const has = parts.includes(value);
    const next = has ? parts.filter((x) => x !== value) : [...parts, value];
    return next.join(',');
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
        <div className="space-y-1 relative">
          <Label htmlFor="fr-cond-agencies" className="text-xs">{t('fr.conditions.agencies')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fr-cond-agencies"
              value={condAgencyQuery}
              onChange={(e) => setCondAgencyQuery(e.target.value)}
              placeholder={t('fr.conditions.agencyPlaceholder')}
              className="h-9 text-sm"
              onKeyDown={async (e:any)=>{ if(e.key==='Enter'){ await doSuggestAgencies(condAgencyQuery); setCondAgencyQuery(''); } }}
            />
            <Button size="sm" variant="secondary" className="h-9" onClick={async ()=>{ await doSuggestAgencies(condAgencyQuery); setCondAgencyQuery(''); }}>{t('fr.conditions.suggest')}</Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2"
              onClick={() => {
                const next = !agencyAllOpen;
                setAgencyAllOpen(next);
                if (next && onLoadAgencyAll) onLoadAgencyAll(1);
              }}
              disabled={agencyAllLoading}
            >
              ▼
            </Button>
          </div>
          {agencyAllOpen && agencyAllItems && agencyAllItems.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow max-h-56 overflow-auto">
              <ul className="text-sm">
                {agencyAllItems
                  .filter((it:any)=>{
                    const q = condAgencyQuery.trim().toLowerCase();
                    if (!q) return true;
                    const name = String(it?.name || it?.title || '').toLowerCase();
                    const slug = String(it?.slug || it?.id || '').toLowerCase();
                    return name.includes(q) || slug.includes(q);
                  })
                  .map((it:any)=>{
                    const name = String(it?.name || it?.title || '').trim();
                    const slug = String(it?.slug || it?.id || '').trim();
                    const disabled = !slug;
                    const count = typeof it?.count === 'number' ? it.count : null;
                    return (
                      <li key={`all-ag-${slug}`}>
                        <button
                          type="button"
                          disabled={disabled}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                          onClick={()=>{
                            const parts = condAgencies.split(',').map((s)=>s.trim()).filter(Boolean);
                            if(slug && !parts.includes(slug)){
                              parts.push(slug);
                              setCondAgencies(parts.join(','));
                              onAdded();
                            }
                          }}
                        >
                          <div className="font-medium">{name || noName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{slug || noSlug}</span>
                            {count !== null && <span className="text-[11px] text-muted-foreground">({count})</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          {condAgencySuggestOpen && condAgencySuggests.length>0 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow">
              <ul className="max-h-56 overflow-auto text-sm">
                {condAgencySuggests.map((it:any)=>{
                  const name = String(it?.name || it?.title || '').trim();
                  const slug = String(it?.slug || it?.id || '').trim();
                  const disabled = !slug;
                  return (
                    <li key={`${name}:${slug}`}>
                      <button
                        type="button"
                        disabled={disabled}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                        onClick={()=>{
                          const parts = condAgencies.split(',').map((s)=>s.trim()).filter(Boolean);
                          if(slug && !parts.includes(slug)){
                            parts.push(slug);
                            setCondAgencies(parts.join(','));
                            onAdded();
                          }
                        }}
                      >
                        <div className="font-medium">{name || noName}</div>
                        <div className="text-xs text-muted-foreground">{slug || noSlug}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-3 py-1.5 border-t text-xs flex items-center justify-between">
                <span>{t('fr.conditions.clickToAdd')}</span>
                <button type="button" className="underline" onClick={()=> setCondAgencySuggestOpen(false)}>{t('fr.conditions.close')}</button>
              </div>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>

        <div className="space-y-1 relative">
          <Label className="text-xs">{t('fr.conditions.types')}</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between h-9 text-sm"
            onClick={() => setTypeOpen((v) => !v)}
            disabled={condTypeLoading}
          >
            <span className="truncate">
              {condTypes.split(',').map((s) => s.trim()).filter(Boolean).join(', ') || t('fr.conditions.typesPlaceholder')}
            </span>
            <span className="text-xs text-muted-foreground">{condTypeLoading ? t('status.loading') : ''}</span>
          </Button>
          {typeOpen && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow max-h-60 overflow-auto">
              {condTypeOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">{condTypeLoading ? t('status.loading') : t('fr.conditions.empty')}</div>
              )}
              {condTypeOptions.map((it: any) => {
                const slug = String(it?.slug || it?.id || '').trim();
                const name = String(it?.name || it?.title || slug || '').trim();
                if (!slug) return null;
                const checked = condTypes.split(',').map((s) => s.trim()).filter(Boolean).includes(slug);
                return (
                  <label key={`type-${slug}`} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setCondTypes(toggleCsv(condTypes, slug));
                        onAdded();
                      }}
                    />
                    <span className="truncate">{name || noName}</span>
                    {typeof it?.count === 'number' && <span className="text-[11px] text-muted-foreground">({it.count})</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1 relative">
          <Label htmlFor="fr-cond-sections" className="text-xs">{t('fr.conditions.sections')}</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between h-9 text-sm"
            onClick={() => setSectionOpen((v) => !v)}
            disabled={!condSectionLoaded}
          >
            <span className="truncate">
              {condSections.split(',').map((s) => s.trim()).filter(Boolean).join(', ') || t('fr.conditions.sectionPlaceholder')}
            </span>
            {!condSectionLoaded && <span className="text-xs text-muted-foreground">{t('status.loading')}</span>}
          </Button>
          {sectionOpen && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow max-h-60 overflow-auto">
              {(!condSectionSource || condSectionSource.length === 0) && (
                <div className="px-3 py-2 text-sm text-muted-foreground">{t('fr.conditions.empty')}</div>
              )}
                {condSectionSource.map((it: any) => {
                  const slug = String(it?.slug || it?.id || '').trim();
                  const name = String(it?.name || it?.title || slug || '').trim();
                  if (!slug) return null;
                  const checked = condSections.split(',').map((s) => s.trim()).filter(Boolean).includes(slug);
                  const count = typeof (it as any)?.count === 'number' ? (it as any).count : null;
                  return (
                    <label key={`sec-${slug}`} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                      onChange={() => {
                        setCondSections(toggleCsv(condSections, slug));
                        onAdded();
                      }}
                    />
                      <span className="truncate">{name || noName}</span>
                      {count !== null && <span className="text-[11px] text-muted-foreground">({count})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>

        <div className="space-y-1 relative">
          <Label htmlFor="fr-cond-topics" className="text-xs">{t('fr.conditions.topics')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="fr-cond-topics"
              value={condTopicQuery}
              onChange={(e) => setCondTopicQuery(e.target.value)}
              placeholder={t('fr.conditions.topicPlaceholder')}
              className="h-9 text-sm"
              onKeyDown={async (e:any)=>{ if(e.key==='Enter'){ await doSuggestTopics(condTopicQuery); setCondTopicQuery(''); } }}
            />
            <Button size="sm" variant="secondary" className="h-9" onClick={async ()=>{ await doSuggestTopics(condTopicQuery); setCondTopicQuery(''); }}>{t('fr.conditions.suggest')}</Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2"
              onClick={()=>{ setTopicAllOpen((v)=>!v); if (!topicAllOpen && onLoadTopicAll) onLoadTopicAll(1); }}
              disabled={!onLoadTopicAll}
            >
              {topicAllLoading ? t('status.loading') : '▼'}
            </Button>
          </div>
          {topicAllOpen && topicAllItems && topicAllItems.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow">
              <ul className="max-h-56 overflow-auto text-sm">
                {topicAllItems.map((it:any)=>{
                  const name = String(it?.name || it?.title || '').trim();
                  const slug = String(it?.slug || it?.id || '').trim();
                  const disabled = !slug;
                  const checked = condTopics.split(',').map((s)=>s.trim()).includes(slug);
                  const count = typeof it?.count === 'number' ? it.count : null;
                  return (
                    <li key={`topic-all:${slug}`}>
                      <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={disabled}
                          checked={checked}
                          onChange={()=>{
                            setCondTopics(toggleCsv(condTopics, slug));
                            onAdded();
                          }}
                        />
                        <span className="flex-1 truncate">{name || noName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{slug || noSlug}</span>
                          {count !== null && <span className="text-[11px] text-muted-foreground">({count})</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {condTopicSuggestOpen && condTopicSuggests.length>0 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-popover text-popover-foreground shadow">
              <ul className="max-h-56 overflow-auto text-sm">
                {condTopicSuggests.map((it:any)=>{
                  const name = String(it?.name || it?.title || '').trim();
                  const slug = String(it?.slug || it?.id || '').trim();
                  const disabled = !slug;
                  return (
                    <li key={`topic:${name}:${slug}`}>
                      <button
                        type="button"
                        disabled={disabled}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                        onClick={()=>{
                          const parts = condTopics.split(',').map((s)=>s.trim()).filter(Boolean);
                          if(slug && !parts.includes(slug)){
                            parts.push(slug);
                            setCondTopics(parts.join(','));
                            onAdded();
                          }
                        }}
                      >
                        <div className="font-medium">{name || noName}</div>
                        <div className="text-xs text-muted-foreground">{slug || noSlug}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-3 py-1.5 border-t text-xs flex items-center justify-between">
                <span>{t('fr.conditions.clickToAdd')}</span>
                <button type="button" className="underline" onClick={()=> setCondTopicSuggestOpen(false)}>{t('fr.conditions.close')}</button>
              </div>
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </div>
    </Card>
  );
}
