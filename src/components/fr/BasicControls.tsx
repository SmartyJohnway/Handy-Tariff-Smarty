import React from 'react';
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BasicControls(props: {
  dateStart: string;
  dateEnd: string;
  perPage: number;
  order: string;
  onDateStartChange: (v: string) => void;
  onDateEndChange: (v: string) => void;
  onPerPageChange: (v: number) => void;
  onOrderChange: (v: string) => void;
  onClearDates?: () => void;
}) {
  const { t } = useTranslation();
  const { dateStart, dateEnd, perPage, order, onDateStartChange, onDateEndChange, onPerPageChange, onOrderChange, onClearDates } = props;
  const datePlaceholder = t('fr.controls.datePlaceholder', { defaultValue: 'YYYY-MM-DD' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="fr-date-start" className="text-xs">{t('fr.controls.startDate')}</Label>
          {onClearDates && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onClearDates}>
              {t('fr.clearDates')}
            </Button>
          )}
        </div>
        <Input id="fr-date-start" value={dateStart} onChange={(e) => onDateStartChange(e.target.value)} placeholder={datePlaceholder} className="h-9 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fr-date-end" className="text-xs">{t('fr.controls.endDate')}</Label>
        <Input id="fr-date-end" value={dateEnd} onChange={(e) => onDateEndChange(e.target.value)} placeholder={datePlaceholder} className="h-9 text-sm" />
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="fr-perpage" className="text-xs">{t('fr.controls.perPage')}</Label>
        <Select value={String(perPage)} onValueChange={(v: string) => onPerPageChange(parseInt(v, 10) || 10)}>
          <SelectTrigger id="fr-perpage" className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="fr-order" className="text-xs">{t('fr.controls.order')}</Label>
        <Select value={order} onValueChange={(v: string) => onOrderChange(v)}>
          <SelectTrigger id="fr-order" className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('fr.controls.orderRecent')}</SelectItem>
            <SelectItem value="oldest">{t('fr.controls.orderOldest')}</SelectItem>
            <SelectItem value="newest">{t('fr.controls.orderNewest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
