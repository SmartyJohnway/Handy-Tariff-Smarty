import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CollapsibleJson } from "@/components/ui/CollapsibleJson";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SuggestedItem = {
  title?: string;
  slug?: string;
  description?: string;
  documents_in_last_year?: number;
  documents_with_open_comment_periods?: number;
  position?: number;
  search_conditions?: Record<string, any>;
};

export function SuggestedSearchesPanel({
  data,
  debugMode,
  onApply,
  applyingSlug,
}: {
  data: any;
  debugMode?: boolean;
  onApply?: (tpl: SuggestedItem, slug?: string) => void;
  applyingSlug?: string | null;
}) {
  const { t } = useTranslation();
  const sections: Record<string, SuggestedItem[]> = (data?.sections ?? {}) as any;
  const [rowOpen, setRowOpen] = React.useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = React.useState<"position" | "activity" | "comments">("position");
  const [applied, setApplied] = React.useState<{ title?: string; term?: string; section?: string } | null>(null);

  const sectionKeys = Object.keys(sections);
  if (!sectionKeys.length) return null;

  const toggleRow = (key: string) => setRowOpen((m) => ({ ...m, [key]: !m[key] }));
  const sectionLabel = (slug?: string) => (slug ? t(`fr.sections.${slug}`, { defaultValue: slug }) : '');

  return (
    <div className="space-y-3">
      {applied && (
        <Alert className="border-primary/40">
          <AlertTitle>{t('fr.suggested.appliedTitle')}</AlertTitle>
          <AlertDescription>
            {applied.section ? <span className="mr-2">[{sectionLabel(applied.section)}]</span> : null}
            <span className="mr-2">{applied.title || t('fr.suggested.untitled')}</span>
            <span className="text-muted-foreground mr-1">{t('fr.suggested.appliedTermLabel')}:</span>
            <span className="break-all">{applied.term || t('fr.suggested.unknown')}</span>
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-3">
        <div className="text-sm text-muted-foreground mb-2">{t('fr.suggested.sectionHint')}</div>
        <Tabs defaultValue={sectionKeys[0] || ""}>
          <TabsList className="flex flex-wrap gap-1">
            {sectionKeys.map((sk) => (
              <TabsTrigger key={sk} value={sk}>
                {sectionLabel(sk)}
              </TabsTrigger>
            ))}
          </TabsList>

          {sectionKeys.map((sk) => {
            const items = Array.isArray(sections[sk]) ? (sections[sk] as SuggestedItem[]) : [];
            return (
              <TabsContent key={`sec-${sk}`} value={sk}>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-sm font-semibold">{sectionLabel(sk)}</div>
                    <Badge variant="secondary">{items.length}</Badge>
                    <div className="ml-auto inline-flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{t('fr.suggested.sortLabel')}</span>
                      <ToggleGroup type="single" value={sortBy} onValueChange={(v: string) => v && setSortBy(v as any)}>
                        <ToggleGroupItem value="position">{t('fr.suggested.sortDefault')}</ToggleGroupItem>
                        <ToggleGroupItem value="activity">{t('fr.suggested.sortActivity')}</ToggleGroupItem>
                        <ToggleGroupItem value="comments">{t('fr.suggested.sortComments')}</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[...items]
                      .sort((a: any, b: any) => {
                        const A = (a?.attributes ?? a) as any;
                        const B = (b?.attributes ?? b) as any;
                        if (sortBy === "activity") return (B?.documents_in_last_year || 0) - (A?.documents_in_last_year || 0);
                        if (sortBy === "comments") return (B?.documents_with_open_comment_periods || 0) - (A?.documents_with_open_comment_periods || 0);
                        return (A?.position || 0) - (B?.position || 0);
                      })
                      .map((raw, idx) => {
                        const it = (raw as any)?.attributes ?? raw;
                        const slugVal = String(it?.slug || '');
                        const key = `${sk}:${slugVal || String(it?.title || idx)}`;
                        const term = String((it?.search_conditions as any)?.term || "").trim();
                        const openRow = !!rowOpen[key];
                        const applying = Boolean(applyingSlug && slugVal && applyingSlug === slugVal);

                        return (
                          <div key={key} className="border rounded">
                            <div
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                              onClick={() => toggleRow(key)}
                            >
                              <span className="font-medium text-left flex-1 truncate">{it.title || it.slug || t('fr.suggested.untitled')}</span>
                              <Badge variant="outline">
                                {typeof it.documents_in_last_year === "number"
                                  ? t('fr.suggested.docsLastYear', { count: it.documents_in_last_year })
                                  : t('fr.suggested.unknown')}
                              </Badge>
                              {typeof it.documents_with_open_comment_periods === "number" && it.documents_with_open_comment_periods > 0 && (
                                <Badge variant="destructive">
                                  {t('fr.suggested.docsComments', { count: it.documents_with_open_comment_periods })}
                                </Badge>
                              )}
                              {onApply && (
                                <Button
                                  size="sm"
                                  className="h-7"
                                  disabled={applying}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onApply(it, slugVal || undefined);
                                    setApplied({ title: it.title || it.slug, term, section: sk });
                                    try {
                                      const el = document.querySelector("[data-fr-results]") as HTMLElement | null;
                                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    } catch {}
                                    setTimeout(() => setApplied(null), 2600);
                                  }}
                                >
                                  {applying ? t('fr.suggested.applying') : t('fr.suggested.apply')}
                                </Button>
                              )}
                            </div>

                            {openRow && (
                              <div className="p-3 space-y-3 bg-muted/30">
                                <div className="text-sm text-muted-foreground">
                                  {t('fr.suggested.appliedTermLabel')}：<span className="text-foreground break-all">{term || t('fr.suggested.unknown')}</span>
                                </div>
                                <div
                                  className="prose prose-sm max-w-none text-muted-foreground"
                                  dangerouslySetInnerHTML={{ __html: String(it?.description || t('fr.suggested.noDescription')) }}
                                />
                                <div>
                                  <div className="text-sm font-medium mb-1">{t('fr.suggested.searchConditions')}</div>
                                  <pre className="p-2 bg-muted rounded text-xs overflow-auto">{JSON.stringify(it?.search_conditions || {}, null, 2)}</pre>
                                </div>
                                {debugMode && <CollapsibleJson title="Raw" data={it} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>
    </div>
  );
}
