import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon } from "lucide-react";

export function SearchBar(props: {
  term: string;
  onTermChange: (v: string) => void;
  loading?: boolean;
  onSearch: () => void;
  debugMode?: boolean;
  searchUrl?: string;
}) {
  const { term, onTermChange, loading, onSearch, debugMode, searchUrl } = props;
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Label htmlFor="fr-term" className="sr-only">{t('fr.search.label')}</Label>
          <Input
            id="fr-term"
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            placeholder={t('fr.search.placeholder')}
            className="w-full h-10 text-sm pl-9"
          />
        </div>
        <Button onClick={onSearch} disabled={!!loading} variant="default" size="sm" className="h-10 px-4 text-sm">
          {loading ? t('fr.search.searching') : t('fr.search.search')}
        </Button>
      </div>
      {debugMode && searchUrl && (
        <div className="mt-2">
          <span className="text-[11px] text-muted-foreground truncate" title={searchUrl}>{searchUrl}</span>
        </div>
      )}
    </Card>
  );
}
