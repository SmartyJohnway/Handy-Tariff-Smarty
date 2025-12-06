import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { UnifiedTariff, ProgramRate } from '@/models/unified';
import { useTranslation } from 'react-i18next';

interface TariffCalculatorProps {
  htsCode: string;
  tariffData: Partial<UnifiedTariff> | null;
  programsLookup: any | null;
}

interface CalculationResult {
  inputs: { hts: string; country: string; value: number; quantity: number; };
  calculation: {
    baseRate: { text: string; value: number };
    preferential: {
      applied: boolean;
      programCode?: string;
      programName?: string;
      rate?: { text: string; value: number };
    };
    finalRate: { 
      adValorem: number;
      specific: number;
      text: string;
    };
    adValoremDuty: number;
    specificDuty: number;
    totalDuty: number;
  };
}

const parseUnitRate = (rateText: string | undefined | null): number => {
  if (!rateText) return 0;
  const match = rateText.match(/([\d.]+)/);
  if (!match) return 0;
  return parseFloat(match[1]);
};

const parseAdValoremRate = (rateText: string | undefined | null): number => {
    if (!rateText) return 0;
    if (rateText.toLowerCase().includes('free')) return 0;
    const match = rateText.match(/([\d.]+)%/);
    if (!match) return 0;
    return parseFloat(match[1]) / 100;
};

export const TariffCalculator: React.FC<TariffCalculatorProps> = ({ htsCode, tariffData, programsLookup }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [declaredValue, setDeclaredValue] = useState<string>('10000');
  const [quantity, setQuantity] = useState<string>('1000');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const countryOptions = useMemo(() => {
    if (!programsLookup) return [];
    const allCountries = new Set<string>();
    Object.values(programsLookup).forEach((p: any) => {
      p.countries?.forEach((c: any) => allCountries.add(String(c)));
    });
    return Array.from(allCountries).sort((a, b) => a.localeCompare(b));
  }, [programsLookup]);

  const unitOfQuantity = useMemo(() => {
    // Strategy 1: Parse unit from base_rate text (e.g., from "$0.01/kg")
    if (tariffData?.base_rate) {
      const match = tariffData.base_rate.match(/\/\s*([a-zA-Z.\s]+)/);
      if (match && match[1]) {
        const unit = match[1].trim();
        // Avoid using generic terms from rate text like 'ad val' as unit
        if (unit.toLowerCase() !== 'ad val') {
          return unit;
        }
      }
    }

    // Strategy 2: Fallback to the raw data structure (original logic)
    const tariffTreatment = (tariffData?.raw as any)?.sections?.find((s: any) => s.id === 'tariff_treatment');
    const uoq = tariffTreatment?.children?.find((c: any) => c.id === 'uoq1')?.value;
    if (uoq && uoq.trim() && uoq !== 'N/A') {
      return uoq;
    }
    
    return 'N/A';
  }, [tariffData]);

  const handleCalculate = () => {
    if (!htsCode || !selectedCountry || !declaredValue || !tariffData) {
      setError(tAny('tariffCalc.errorMissing'));
      return;
    }
    setError(null);
    setResult(null);

    try {
      const declaredValueNum = parseFloat(declaredValue);
      const quantityNum = parseFloat(quantity);

      // --- Start of new Calculation Engine ---
      let finalAdValoremRate = 0;
      let finalSpecificRate = 0;
      let finalRateText = tariffData.base_rate || 'N/A';
      let appliedProgram: (ProgramRate & { description?: string }) | null = null;

      const tariffTreatment = (tariffData.raw as any)?.sections?.find((s: any) => s.id === 'tariff_treatment');
      const mfnRates = tariffTreatment?.children?.find((c: any) => c.id === 'mfn');
      const mfnAdValoremText = mfnRates?.children?.find((c: any) => c.id === 'adv_rate_comp')?.value;
      const mfnSpecificText = mfnRates?.children?.find((c: any) => c.id === 'spec_rate_comp')?.value;

      // Fallback: if DataWeb raw sections缺失，至少用 base_rate 字串解析 ad valorem
      const baseAdValorem = parseAdValoremRate(mfnAdValoremText) || parseAdValoremRate(tariffData.base_rate);
      const baseSpecific = parseUnitRate(mfnSpecificText);

      finalAdValoremRate = baseAdValorem;
      finalSpecificRate = baseSpecific;

      // Check for preferential rates
      const eligiblePrograms = (tariffData.programs_dataweb || []).filter(p => p.status === 'Eligible');
      for (const prog of eligiblePrograms) {
        const lookupInfo = programsLookup?.[prog.code];
        if (lookupInfo && lookupInfo.countries.includes(selectedCountry)) {
          const programDetails = (tariffData.raw as any)?.sections
            ?.find((s: any) => s.id === 'tariff_program')
            ?.children?.find((p: any) => p.id === prog.code.toLowerCase());

          const prefAdValoremText = programDetails?.children?.find((c: any) => c.id === 'advr')?.value ?? prog.rate_text;
          const prefSpecificText = programDetails?.children?.find((c: any) => c.id === 'spec')?.value ?? prog.rate_text;

          const prefAdValorem = parseAdValoremRate(prefAdValoremText);
          const prefSpecific = parseUnitRate(prefSpecificText);

          finalAdValoremRate = prefAdValorem;
          finalSpecificRate = prefSpecific;
          finalRateText = prefAdValoremText || finalRateText;

          appliedProgram = { ...prog, description: lookupInfo.desc };
          break; 
        }
      }
      
      // TODO: Add logic for extra duties (Sec 232/301, AD/CVD) from tariffData.extra_duties

      const adValoremDuty = declaredValueNum * finalAdValoremRate;
      const specificDuty = quantityNum * finalSpecificRate;
      const totalDuty = adValoremDuty + specificDuty;

      const calculationResult: CalculationResult = {
        inputs: { hts: htsCode, country: selectedCountry, value: declaredValueNum, quantity: quantityNum },
        calculation: {
          baseRate: { text: tariffData.base_rate || 'N/A', value: baseAdValorem },
          preferential: appliedProgram ? {
            applied: true,
            programCode: appliedProgram.code,
            programName: appliedProgram.description,
            rate: { text: finalRateText, value: finalAdValoremRate },
          } : { applied: false },
          finalRate: { adValorem: finalAdValoremRate, specific: finalSpecificRate, text: finalRateText },
          adValoremDuty,
          specificDuty,
          totalDuty,
        },
      };

      setResult(calculationResult);

    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle>{tAny('tariffCalc.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country-select">{tAny('tariffCalc.country')}</Label>
            <Select 
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              disabled={!programsLookup}
            >
              <SelectTrigger id="country-select">
                <SelectValue placeholder={programsLookup ? tAny('tariffCalc.selectCountry') : tAny('tariffCalc.loadingCountries')} />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="declared-value">{tAny('tariffCalc.declaredValue')}</Label>
            <Input 
              id="declared-value"
              type="number"
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
              placeholder={tAny('tariffCalc.declaredPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">{tAny('tariffCalc.quantity', { unit: unitOfQuantity })}</Label>
            <Input 
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={tAny('tariffCalc.quantityPlaceholder')}
            />
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={!tariffData || !programsLookup}>{!tariffData ? tAny('tariffCalc.loadingHts') : tAny('tariffCalc.calculate')}</Button>
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tAny('status.error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="pt-4 border-t">
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground mb-4">
              <p className="font-semibold">{tAny('tariffCalc.noteTitle')}</p>
              <p>{tAny('tariffCalc.noteBody')}</p>
            </div>
            <h3 className="font-semibold mb-2">{tAny('tariffCalc.resultTitle')}</h3>
            <div className="space-y-2 text-sm">
              <p><strong>{tAny('tariffCalc.baseRate')}:</strong> {result.calculation.baseRate.text}</p>
              {result.calculation.preferential.applied ? (
                <div className="p-2 bg-success/10 border-l-4 border-success">
                  <p><strong>{tAny('tariffCalc.prefApplied')}:</strong> {result.calculation.preferential.programName} ({result.calculation.preferential.programCode})</p>
                  <p><strong>{tAny('tariffCalc.prefRate')}:</strong> {result.calculation.preferential.rate?.text}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">{tAny('tariffCalc.noPref', { country: result.inputs.country })}</p>
              )}
              <div className="mt-2 p-2 bg-primary/10 border-l-4 border-primary">
                <p>{tAny('tariffCalc.adValoremDuty')}: ${result.calculation.adValoremDuty.toFixed(2)}</p>
                <p>{tAny('tariffCalc.specificDuty')}: ${result.calculation.specificDuty.toFixed(2)}</p>
              </div>
              <p className="font-bold text-lg">{tAny('tariffCalc.finalDuty')}: <span className="text-primary">{result.calculation.totalDuty.toFixed(2)} USD</span></p>
              
              <div className="mt-4 space-y-2 pt-4 border-t">
                <div className="p-2 bg-warning/10 border-l-4 border-warning">
                    <p><strong>{tAny('tariffCalc.notice232')}</strong></p>
                    <p className="text-xs text-muted-foreground">{tAny('tariffCalc.notice232Desc')}</p>
                </div>
                <div className="p-2 bg-info/10 border-l-4 border-info">
                    <p><strong>{tAny('tariffCalc.noticeAdcvd')}</strong></p>
                    <p className="text-xs text-muted-foreground">{tAny('tariffCalc.noticeAdcvdDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
