import React from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";

type Props = {
  allFacets: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

export function FacetControls({ allFacets, selected, onChange, className }: Props) {
  const { t } = useTranslation();
  const setSelected = (arr: string[]) => onChange(Array.from(new Set(arr)));
  const toggle = (f: string, v: boolean) => {
    if (v) setSelected([...selected, f]);
    else setSelected(selected.filter(x => x !== f));
  };
  const presets = {
    default: ["agency", "type", "topic", "quarterly"],
    all: allFacets,
    none: [] as string[],
  };
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 text-sm mb-1">
        {allFacets.map((f) => (
          <label key={f} className="inline-flex items-center gap-1">
            <Checkbox
              id={`facet-${f}`}
              checked={selected.includes(f)}
              onCheckedChange={(v: boolean) => toggle(f, Boolean(v))}
            />
            <span className="capitalize">{f}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Label className="text-[11px]">{t('fr.facetControls.presets')}</Label>
        <Button
          size="sm"
          variant="secondary"
          className="h-auto px-2 py-0.5"
          onClick={() => setSelected(presets.default)}
        >
          {t('fr.facetControls.default')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-auto px-2 py-0.5"
          onClick={() => setSelected(presets.all)}
        >
          {t('fr.facetControls.all')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-auto px-2 py-0.5"
          onClick={() => setSelected(presets.none)}
        >
          {t('fr.facetControls.none')}
        </Button>
      </div>
    </div>
  );
}
