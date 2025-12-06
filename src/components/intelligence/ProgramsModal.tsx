import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/Button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from 'react-i18next';

import type { ProgramRate } from '@/models/unified';

interface ProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramRate[];
  effectiveDate?: string;
  endDate?: string;
}

interface ProgramLookup {
  [code: string]: {
    desc: string;
    countries: string[];
    group_name: string;
  }
}

export const ProgramsModal: React.FC<ProgramsModalProps> = ({ isOpen, onClose, programs, effectiveDate, endDate }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [lookup, setLookup] = useState<ProgramLookup>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Eligible' | 'Not Eligible'>('all');

  useEffect(() => {
    if (isOpen && Object.keys(lookup).length === 0) {
      setIsLoading(true);
      fetch('/api/get-program-names')
        .then(res => res.json())
        .then(data => {
          const indexedData = data.programs.reduce((acc: ProgramLookup, p: any) => {
            acc[p.code] = {
              desc: p.description,
              countries: p.countriesgroups?.countries || [],
              group_name: p.countriesgroups?.group_name || 'N/A'
            };
            return acc;
          }, {});
          setLookup(indexedData);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, lookup]);

  const mergedPrograms = useMemo(() => {
    return programs
      .map(prog => ({
        ...prog,
        description: lookup[prog.code]?.desc || 'N/A',
        countries: lookup[prog.code]?.countries || [],
        group_name: lookup[prog.code]?.group_name || 'N/A',
      }))
      .filter(prog => {
        if (statusFilter === 'all') return true;
        return prog.status === statusFilter;
      });
  }, [programs, lookup, statusFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{tAny('programs.title')}</DialogTitle>
          <DialogDescription>
            {tAny('programs.description', {
              start: effectiveDate ? new Date(effectiveDate).toLocaleDateString() : tAny('programs.na'),
              end: endDate ? new Date(endDate).toLocaleDateString() : tAny('programs.na')
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">{tAny('programs.filter')}</Label>
            <RadioGroup value={statusFilter} onValueChange={(v: string) => v && setStatusFilter(v as any)} className="flex items-center gap-4">
              {(['all', 'Eligible', 'Not Eligible'] as const).map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <RadioGroupItem value={status} id={`status-${status}`} />
                  <Label htmlFor={`status-${status}`} className="font-normal">
                    {status === 'all' ? tAny('programs.status.all') : status === 'Eligible' ? tAny('programs.status.eligible') : tAny('programs.status.notEligible')}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="overflow-x-auto rounded-lg border max-h-[60vh]">
            {isLoading ? (
              <p className="p-4 text-center text-muted-foreground">{tAny('programs.loading')}</p>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5">{tAny('programs.table.program')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/5">{tAny('programs.table.rate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-2/5">{tAny('programs.table.countries')}</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border text-card-foreground">
                  {mergedPrograms.map((prog, index) => (
                    <tr key={`${prog.code}-${index}`}>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold">{prog.code}</span>
                          <Badge variant={prog.status === 'Eligible' ? 'default' : 'destructive'} className="ml-2">
                            {prog.status === 'Eligible' ? tAny('programs.status.eligible') : tAny('programs.status.notEligible')}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{prog.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground align-top">{prog.rate_text}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground align-top">
                        <div className="flex flex-col">
                          <span className="font-medium">{prog.group_name}</span>
                          {prog.countries.length > 0 && (
                            <Select>
                              <SelectTrigger className="mt-1 h-7 text-xs">
                                <SelectValue placeholder={tAny('programs.countriesPlaceholder', { count: prog.countries.length })} />
                              </SelectTrigger>
                              <SelectContent>
                                {prog.countries.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tAny('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
