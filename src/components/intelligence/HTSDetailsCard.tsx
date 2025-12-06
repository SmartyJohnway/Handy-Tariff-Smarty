import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Factory, Globe, Building, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RateText, UnifiedTariff, InvestigationTag, ProgramRate } from '@/models/unified';
import { ProgramsModal } from '@/components/intelligence/ProgramsModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from 'react-i18next';

// --- Helper Components ---

const Stat: React.FC<{ label: string, value: string | React.ReactNode, icon: React.ReactNode, title?: string }> = ({ label, value, icon, title }) => {
  const content = (
    <div className="flex h-full items-center justify-between rounded-2xl border p-4 shadow-sm bg-card">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted p-2">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className={`text-xl font-semibold tracking-tight`}>{value}</div>
        </div>
      </div>
    </div>
  );

  if (!title) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild><div className="cursor-help h-full">{content}</div></TooltipTrigger>
      <TooltipContent><p>{title}</p></TooltipContent>
    </Tooltip>
  );
}

// --- Main HTSDetailsCard Component ---

interface HTSDetailsCardProps {
  data: Partial<UnifiedTariff>;
}

export const HTSDetailsCard: React.FC<HTSDetailsCardProps> = ({ data }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [isProgramsModalOpen, setProgramsModalOpen] = useState(false);

  // Derive values from the unified data structure
  const activeHts = data.hts8 || 'N/A';
  const htsDescription = (data.raw as any)?.description || tAny('htsCard.noHtsDescription');
  const datawebDescription = data.description || tAny('htsCard.noDatawebDescription');
  const mfnRate = data.base_rate;
  const col2Rate = (data.raw as any)?.other || null;
  const s301 = data.extra_duties?.s301;

  const s301List = useMemo(() => {
    const name = s301?.source?.name || '';
    const m = name.match(/List\s*([0-9A-Z]+)/i);
    return m ? `List ${m[1].toUpperCase()}` : null;
  }, [s301]);

  const applicableBadges = useMemo(() => {
    const badges: { label: string; severity: 'high' | 'medium', title: string }[] = [];

    if (data.extra_duties?.s232_steel) {
        badges.push({ label: tAny('htsCard.sec232Steel'), severity: 'high', title: tAny('htsCard.sec232SteelDesc') });
    }
    if (data.extra_duties?.s232_aluminum) {
        badges.push({ label: tAny('htsCard.sec232Aluminum'), severity: 'high', title: tAny('htsCard.sec232AluminumDesc') });
    }
    if (data.extra_duties?.s301) {
        badges.push({ label: tAny('htsCard.sec301'), severity: 'high', title: tAny('htsCard.sec301Desc') });
    }

    const investigationTypes = new Set<string>();
    (data.investigations || []).forEach(inv => {
        (inv.types || []).forEach(type => {
            if (type !== 'Other') {
                investigationTypes.add(type);
            }
        });
    });

    investigationTypes.forEach(type => {
        badges.push({ label: tAny('htsCard.investigationBadge', { type }), severity: 'medium', title: tAny('htsCard.investigationTitle', { type }) });
    });

    return badges;
  }, [data]);

  // Format special programs text for the main display (using baseline data)
  const specialRateText = useMemo(() => {
    if (!data.programs || data.programs.length === 0) {
      return null;
    }
    const rate = data.programs[0].rate_text;
    const codes = data.programs.map(p => p.code).join(', ');
    return `${rate} (${codes})`;
  }, [data.programs]);

  return (
    <>
      <TooltipProvider>
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">
              <span>{tAny('htsCard.detailsTitle', { code: activeHts })}</span>
            </CardTitle>
            <div className="pt-2 text-sm text-muted-foreground border-t mt-2 space-y-1">
              <div className="flex items-start">
                <Badge variant="outline" className="mr-2">HTS.gov</Badge>
                <span className="text-foreground">{htsDescription}</span>
              </div>
              <div className="flex items-start">
                <Badge variant="outline" className="mr-2">DataWeb</Badge><span className="text-foreground">{datawebDescription}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Stat label={tAny('htsCard.mfnRate')} value={mfnRate ?? tAny('htsCard.na')} icon={<Globe className="h-5 w-5" />} />
            <Stat label={tAny('htsCard.col2Rate')} value={col2Rate ?? tAny('htsCard.na')} icon={<Building className="h-5 w-5" />} />
            
            {applicableBadges.length > 0 && ( // Use first badge as the representative
              <Stat 
                label={tAny('htsCard.applicableRegs')} 
                value={
                  <div className="flex flex-wrap gap-2 mt-1">
                    {applicableBadges.map(badge => (
                      <Badge key={badge.label} variant={badge.severity === 'high' ? 'destructive' : 'secondary'}>{badge.label}</Badge>
                    ))}
                  </div>
                } 
                icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                title={applicableBadges.map(b => b.title).join(' ')}
              />
            )}
          </div>

          {specialRateText && (
            <div className="rounded-lg border bg-accent p-3">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-accent-foreground flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-2 text-success" />
                  {tAny('htsCard.specialRates')}
                </div>
                <Button variant="outline" size="sm" onClick={() => setProgramsModalOpen(true)}>{tAny('htsCard.specialDetails')}</Button>
              </div>
              <div className="text-sm text-accent-foreground pt-2">{specialRateText}</div>
            </div>
          )}

          {s301 && (
            <div className="rounded-lg border bg-destructive/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {tAny('htsCard.s301Measures')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{tAny('htsCard.s301List')}</div>
                  <div className="font-semibold text-foreground">{s301List || tAny('htsCard.na')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tAny('htsCard.s301Rate')}</div>
                  <div className="font-semibold text-foreground">{s301.max_rate_text || tAny('htsCard.na')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tAny('htsCard.s301Effective')}</div>
                  <div className="font-semibold text-foreground">{s301.source?.effective || tAny('htsCard.na')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tAny('htsCard.s301Action')}</div>
                  <div className="font-semibold text-foreground">{s301.source?.action_title || s301.source?.action || s301.source?.name || tAny('htsCard.na')}</div>
                </div>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </TooltipProvider>
      <ProgramsModal 
        isOpen={isProgramsModalOpen} 
        onClose={() => setProgramsModalOpen(false)} 
        programs={data.programs_dataweb || []} 
        effectiveDate={data.effectiveDate}
        endDate={data.endDate}
      />
    </>
  );
};
