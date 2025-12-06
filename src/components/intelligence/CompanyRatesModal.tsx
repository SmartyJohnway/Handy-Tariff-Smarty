import React from 'react';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from '@/components/ui/EmptyState';
import { useTranslation } from 'react-i18next';

// --- Type Definitions ---

interface CompanyRow {
  company: string;
  rate: string;
  [key: string]: any;
}

interface CompanyRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: string | null;
  isLoading: boolean;
  error: string | null;
  rows: CompanyRow[];
  title?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  periodText?: string | null;
  headingText?: string | null;
}

// --- Main CompanyRatesModal Component ---

export const CompanyRatesModal: React.FC<CompanyRatesModalProps> = ({ 
  isOpen, 
  onClose, 
  country, 
  isLoading, 
  error, 
  rows,
  title,
  periodStart,
  periodEnd,
  periodText,
  headingText,
}) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tAny('companyRates.title', { country: country || tAny('companyRates.unknownCountry') })}</DialogTitle>
          <DialogDescription>
            {tAny('companyRates.description')}
          </DialogDescription>
          {(headingText || title) && <div className="text-sm font-medium mt-1">{headingText || title}</div>}
          {(periodText || periodStart || periodEnd) && (
            <div className="text-xs text-muted-foreground">
              {periodText
                ? periodText
                : (periodStart && periodEnd
                    ? `${periodStart} - ${periodEnd}`
                    : (periodStart || periodEnd))}
            </div>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{tAny('status.loading')}</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border max-h-[60vh]">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tAny('companyRates.company')}</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">{tAny('companyRates.rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    r.company === 'N/A' ? (
                      <tr key={idx} className="border-t border-border">
                        <td colSpan={2} className="px-3 py-2 text-center">
                          <a href={r.rate} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 underline">{tAny('companyRates.viewOnFr')}</a>
                        </td>
                      </tr>
                    ) : (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-3 py-2">{r.company}</td>
                        <td className="px-3 py-2 font-bold text-destructive">{r.rate}</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title={tAny('companyRates.emptyTitle')}
              description={tAny('companyRates.emptyDesc')}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tAny('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
