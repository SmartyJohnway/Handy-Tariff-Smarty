import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CollapsibleJson } from "@/components/ui/CollapsibleJson";

type Agency = any;

function renderValue(val: any, t?: (k: string, opts?: any) => string): React.ReactNode {
  const empty = <span className="text-muted-foreground">{t ? t('status.empty') : 'N/A'}</span>;
  if (val === null || val === undefined) return empty;
  if (Array.isArray(val)) return val.length ? val.join(', ') : empty;
  if (typeof val === 'object') {
    return (
      <ul className="list-disc pl-4">
        {Object.entries(val).map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> {renderValue(v, t)}</li>
        ))}
      </ul>
    );
  }
  if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
    return <a className="text-primary hover:underline break-all" href={val} target="_blank" rel="noreferrer">{val}</a>;
  }
  return <span className="break-words">{String(val)}</span>;
}

function AgencyDetailTable({ agency, t }: { agency: Agency; t?: (k: string, opts?: any) => string }) {
  const a = agency?.attributes ?? agency;
  return (
    <div className="p-3 border rounded bg-muted/30">
      <Table>
        <TableBody>
          {Object.entries(a).filter(([k]) => k !== 'children').map(([k, v]) => (
            <TableRow key={k}>
              <TableCell className="w-1/3 align-top font-medium">{k}</TableCell>
              <TableCell className="w-2/3 align-top">{renderValue(v, t)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function buildHierarchy(items: Agency[]): Agency[] {
  const list = items.map(x => x?.attributes ?? x);
  const map = new Map<number, any>();
  list.forEach(a => map.set(a.id, { ...a, children: [] }));
  const roots: any[] = [];
  map.forEach(a => {
    if (a.parent_id == null) roots.push(a);
    else {
      const p = map.get(a.parent_id);
      if (p) p.children.push(a); else roots.push(a);
    }
  });
  const byName = (a: any, b: any) => String(a.name || '').localeCompare(String(b.name || ''));
  roots.sort(byName);
  map.forEach(a => a.children && a.children.sort(byName));
  return roots;
}

const countTree = (node: any): number => {
  const kids = Array.isArray(node?.children) ? node.children : [];
  return 1 + kids.reduce((s: number, c: any) => s + countTree(c), 0);
};

// Functional categories (keywords in name/description)
const FUNCTIONAL_CATEGORIES: Record<string, string[]> = {
  defense: ['defense', 'military', 'army', 'navy', 'air force', 'security', 'terrorist', 'intelligence', 'weapons', 'counterintelligence'],
  finance: ['financial', 'economic', 'treasury', 'tax', 'trade', 'commerce', 'business', 'currency', 'investment', 'export', 'import', 'budget', 'consumer'],
  health: ['health', 'medical', 'disease', 'drug', 'medicare', 'medicaid', 'food', 'mental health', 'healthcare', 'nutrition'],
  justice: ['justice', 'law', 'court', 'legal', 'crime', 'prison', 'enforcement', 'civil rights', 'immigration', 'firearms', 'investigation', 'parole'],
  environment: ['environmental', 'environment', 'natural resources', 'park', 'wildlife', 'oceanic', 'energy', 'land management', 'mining', 'geological', 'reclamation', 'atmosphere', 'epa'],
  science: ['science', 'technology', 'space', 'nasa', 'standards', 'technical', 'aeronautics', 'nanotechnology', 'cyber'],
  transport: ['transportation', 'aviation', 'highway', 'railroad', 'maritime', 'transit', 'motor carrier', 'seaway'],
  agriculture: ['agriculture', 'agricultural', 'farm', 'crop', 'rural', 'forest'],
  admin: ['administration', 'service', 'personnel', 'archives', 'management', 'government', 'oversight', 'relations', 'commission', 'policy', 'ethics', 'services'],
  social: ['humanities', 'arts', 'education', 'social security', 'housing', 'veterans', 'labor', 'disability', 'indian', 'community'],
};

const FUNCTIONAL_LABEL_KEYS: Record<string, string> = {
  defense: 'fr.agencies.funcDefense',
  finance: 'fr.agencies.funcFinance',
  health: 'fr.agencies.funcHealth',
  justice: 'fr.agencies.funcJustice',
  environment: 'fr.agencies.funcEnvironment',
  science: 'fr.agencies.funcScience',
  transport: 'fr.agencies.funcTransport',
  agriculture: 'fr.agencies.funcAgriculture',
  admin: 'fr.agencies.funcAdmin',
  social: 'fr.agencies.funcSocial',
  other: 'fr.agencies.funcOther',
};

const TYPE_CATEGORIES: Record<string, string[]> = {
  departments: ['department'],
  commissions: ['commission'],
  administrations: ['administration', 'bureau'],
  offices: ['office'],
  foundations: ['foundation', 'board'],
  corporations: ['corporation'],
  services: ['service'],
  councils: ['council'],
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  departments: 'fr.agencies.typeDepartments',
  commissions: 'fr.agencies.typeCommissions',
  administrations: 'fr.agencies.typeAdministrations',
  offices: 'fr.agencies.typeOffices',
  foundations: 'fr.agencies.typeFoundations',
  corporations: 'fr.agencies.typeCorporations',
  services: 'fr.agencies.typeServices',
  councils: 'fr.agencies.typeCouncils',
  other: 'fr.agencies.typeOther',
};

function classifyByFunction(list: any[]): Map<string, any[]> {
  const categorized = new Map<string, any[]>(Object.keys(FUNCTIONAL_CATEGORIES).map(k => [k, [] as any[]]));
  const others: any[] = [];
  for (const raw of list) {
    const a = raw?.attributes ?? raw;
    const text = (String(a.name || '') + ' ' + String(a.description || '')).toLowerCase();
    let hit = false;
    for (const [cat, kws] of Object.entries(FUNCTIONAL_CATEGORIES)) {
      if (kws.some(kw => text.includes(kw))) { (categorized.get(cat) as any[]).push(a); hit = true; break; }
    }
    if (!hit) others.push(a);
  }
  const byName = (x: any, y: any) => String(x.name || '').localeCompare(String(y.name || ''));
  categorized.forEach(arr => arr.sort(byName));
  others.sort(byName);
  if (others.length) categorized.set('other', others);
  return categorized;
}

function classifyByType(list: any[]): Map<string, any[]> {
  const categorized = new Map<string, any[]>(Object.keys(TYPE_CATEGORIES).map(k => [k, [] as any[]]));
  const others: any[] = [];
  for (const raw of list) {
    const a = raw?.attributes ?? raw;
    const name = String(a.name || '');
    let hit = false;
    for (const [cat, kws] of Object.entries(TYPE_CATEGORIES)) {
      const re = new RegExp(`\\b(${kws.join('|')})\\b`, 'i');
      if (re.test(name)) { (categorized.get(cat) as any[]).push(a); hit = true; break; }
    }
    if (!hit) others.push(a);
  }
  const byName = (x: any, y: any) => String(x.name || '').localeCompare(String(y.name || ''));
  categorized.forEach(arr => arr.sort(byName));
  others.sort(byName);
  if (others.length) categorized.set('other', others);
  return categorized;
}

export function AgenciesAllPanel({ agencies, debugMode }: { agencies: Agency[]; debugMode?: boolean }) {
  const { t } = useTranslation();
  const tAny = t as (key: string, opts?: any) => string;
  const roots = useMemo(() => buildHierarchy(agencies || []), [agencies]);
  const flatList = useMemo(() => (agencies || []).map((x: any) => x?.attributes ?? x), [agencies]);
  const [tab, setTab] = React.useState<'hierarchical' | 'functional' | 'type'>('type');
  const [q, setQ] = React.useState<string>("");
  const [funcSort, setFuncSort] = React.useState<'name' | 'count'>('name');
  const [typeSort, setTypeSort] = React.useState<'name' | 'count'>('name');

  if (!roots.length) return null;

  const match = (a: any) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const name = String(a?.name || '').toLowerCase();
    const slug = String(a?.slug || '').toLowerCase();
    return name.includes(s) || slug.includes(s);
  };

  const filterTree = (nodes: any[]): any[] => {
    const res: any[] = [];
    for (const n of nodes) {
      const children = Array.isArray(n.children) ? filterTree(n.children) : [];
      if (match(n) || children.length) {
        res.push({ ...n, children });
      }
    }
    return res;
  };

  const rootsFiltered = useMemo(() => q.trim() ? filterTree(roots) : roots, [q, roots]);
  const flatFiltered = useMemo(() => (flatList || []).filter(match), [q, flatList]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[220px] max-w-[420px]">
          <Input placeholder={t('fr.agencies.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} className="h-9 text-sm" />
        </div>
        {q && <Button size="sm" variant="ghost" className="h-8" onClick={() => setQ("")}>{t('fr.agencies.clear')}</Button>}
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hierarchical">{t('fr.agencies.tabHierarchical')}</TabsTrigger>
          <TabsTrigger value="functional">{t('fr.agencies.tabFunctional')}</TabsTrigger>
          <TabsTrigger value="type">{t('fr.agencies.tabType')}</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchical">
          {rootsFiltered.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('fr.agencies.noResults')}</div>
          ) : (
            <Card className="p-3">
              <div className="space-y-4">
                <details className="border rounded">
                  <summary className="flex items-center justify-between px-2 py-2 cursor-pointer font-semibold hover:bg-muted/50">
                    <span>{t('fr.agencies.topWithChildren')}</span>
                    <Badge variant="outline">
                      {t('fr.agencies.agencyCount', {
                        count: rootsFiltered
                          .filter(r => Array.isArray(r.children) && r.children.length > 0)
                          .reduce((sum, r) => sum + countTree(r), 0),
                      })}
                    </Badge>
                  </summary>
                  <div className="pt-1 space-y-2">
                    {rootsFiltered.filter(r => Array.isArray(r.children) && r.children.length > 0).map((r) => (
                      <details key={`top-${String(r.id)}`} className="border-b group">
                        <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                          <span className="font-semibold flex items-center gap-2">
                            {r.name}
                            {r.short_name && <Badge variant="secondary">{r.short_name}</Badge>}
                            {r.slug && <Badge variant="outline">{r.slug}</Badge>}
                          </span>
                          <Badge variant="secondary" className="ml-2">{t('fr.agencies.childCount', { count: r.children.length })}</Badge>
                        </summary>
                        <div className="space-y-3 pb-2">
                          <AgencyDetailTable agency={r} t={tAny} />
                          <details className="mt-2 pl-3 border-l-2 border-border">
                            <summary className="flex items-center justify-between py-1 cursor-pointer text-sm font-medium text-primary hover:underline">
                              <span>{t('fr.agencies.children')}</span>
                              <Badge variant="outline">{r.children?.length || 0}</Badge>
                            </summary>
                            <div className="mt-1 space-y-2">
                              {(r.children || []).map((c: any) => (
                                <details key={`child-${String(r.id)}-${String(c.id)}`} className="border-b group ml-2">
                                  <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                                    <span className="font-medium">{c.name}</span>
                                  </summary>
                                  <div className="pb-2">
                                    <AgencyDetailTable agency={c} t={tAny} />
                                  </div>
                                </details>
                              ))}
                            </div>
                          </details>
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
                <details className="border rounded">
                  <summary className="flex items-center justify-between px-2 py-2 cursor-pointer font-semibold hover:bg-muted/50">
                    <span>{t('fr.agencies.noChildren')}</span>
                    <Badge variant="outline">{t('fr.agencies.agencyCount', { count: rootsFiltered.filter(r => !r.children || r.children.length === 0).length })}</Badge>
                  </summary>
                  <div className="pt-1">
                    {(rootsFiltered.filter(r => !r.children || r.children.length === 0)).map((r) => (
                      <details key={`ind-${String(r.id)}`} className="border-b group">
                        <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                          <span className="font-semibold flex items-center gap-2">
                            {r.name}
                            {r.short_name && <Badge variant="secondary">{r.short_name}</Badge>}
                            {r.slug && <Badge variant="outline">{r.slug}</Badge>}
                          </span>
                        </summary>
                        <div className="pb-2">
                          <AgencyDetailTable agency={r} t={tAny} />
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="functional">
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="text-muted-foreground">{t('fr.agencies.sortLabel')}</span>
            <Button size="sm" variant={funcSort === 'name' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setFuncSort('name')}>{t('fr.agencies.sortName')}</Button>
            <Button size="sm" variant={funcSort === 'count' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setFuncSort('count')}>{t('fr.agencies.sortCount')}</Button>
          </div>
          <Card className="p-3">
            {Array.from(classifyByFunction(flatFiltered).entries())
              .sort((a: any, b: any) => funcSort === 'count' ? (b[1].length - a[1].length) : String(a[0]).localeCompare(String(b[0])))
              .map(([cat, arr]) => (
                arr.length > 0 && (
                  <details key={`fun-${String(cat)}`} className="border-b group">
                    <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                      <span className="font-semibold">{tAny(FUNCTIONAL_LABEL_KEYS[cat] || cat)}</span>
                      <Badge variant="secondary" className="ml-2">{t('fr.agencies.agencyCount', { count: arr.length })}</Badge>
                    </summary>
                    <div className="pb-2">
                      {arr.map((a: any) => (
                        <details key={`fun-ag-${String(cat)}-${String(a.id)}`} className="border-b group ml-2">
                          <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                            <span className="font-medium">{a.name}</span>
                          </summary>
                          <div className="pb-2">
                            <AgencyDetailTable agency={a} t={tAny} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                )
              ))}
          </Card>
        </TabsContent>

        <TabsContent value="type">
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="text-muted-foreground">{t('fr.agencies.sortLabel')}</span>
            <Button size="sm" variant={typeSort === 'name' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setTypeSort('name')}>{t('fr.agencies.sortName')}</Button>
            <Button size="sm" variant={typeSort === 'count' ? 'secondary' : 'ghost'} className="h-7" onClick={() => setTypeSort('count')}>{t('fr.agencies.sortCount')}</Button>
          </div>
          <Card className="p-3">
            {Array.from(classifyByType(flatFiltered).entries())
              .sort((a: any, b: any) => typeSort === 'count' ? (b[1].length - a[1].length) : String(a[0]).localeCompare(String(b[0])))
              .map(([cat, arr]) => (
                arr.length > 0 && (
                  <details key={`typ-${String(cat)}`} className="border-b group">
                    <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                      <span className="font-semibold">{tAny(TYPE_LABEL_KEYS[cat] || cat)}</span>
                      <Badge variant="secondary" className="ml-2">{t('fr.agencies.agencyCount', { count: arr.length })}</Badge>
                    </summary>
                    <div className="pb-2">
                      {arr.map((a: any) => (
                        <details key={`typ-ag-${String(cat)}-${String(a.id)}`} className="border-b group ml-2">
                          <summary className="flex items-center justify-between py-2 cursor-pointer hover:underline">
                            <span className="font-medium">{a.name}</span>
                          </summary>
                          <div className="pb-2">
                            <AgencyDetailTable agency={a} t={tAny} />
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                )
              ))}
          </Card>
        </TabsContent>
      </Tabs>

      {debugMode && (
        <Card className="p-3">
          <CollapsibleJson title="Agencies (Raw)" data={agencies} />
        </Card>
      )}
    </div>
  );
}
