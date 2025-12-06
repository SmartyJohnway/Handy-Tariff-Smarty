import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  isOpen: boolean;
  hasData: boolean;
  onLoad: () => void;
  onToggle: () => void;
  children: React.ReactNode;
  loadText?: string;
  loading?: boolean;
};

export function StandalonePanelContainer({ title, isOpen, hasData, onLoad, onToggle, children, loadText = "Load", loading = false }: Props) {
  const { t } = useTranslation();
  const loadLabel = loadText || t('fr.load');

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          {!hasData && (
            <Button size="sm" variant="secondary" className="h-8" onClick={onLoad} disabled={loading}>
              {loading ? t('status.loading') : loadLabel}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8" onClick={onToggle}>
            {isOpen ? t('fr.hide') : t('fr.show')}
          </Button>
        </div>
      </div>
      {isOpen && children}
    </>
  );
}
