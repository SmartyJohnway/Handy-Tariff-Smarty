import React from 'react';
import NaicsCommodityTranslator from '../components/NaicsCommodityTranslator';
import { Card } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AdcvdSearchCard } from '@/components/AdcvdSearchCard';
import { Ustr301Explorer } from '@/components/Ustr301Explorer';

export default function CommodityTranslationTool() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Commodity Search Tool</h2>
        <p className="text-sm text-muted-foreground">HTScode to NAICS / ADCVD case Number / USTR 301</p>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">NAICS Commodity Translator</h3>
          <p className="text-sm text-muted-foreground">呼叫 `/api/dataweb-adapter?translation=commodity`（POST）以 DataWeb Commodity Translation API 轉換。</p>
        </div>
        <NaicsCommodityTranslator />
        <Alert>
          <AlertDescription>
            參考來源：
            <a className="text-primary hover:text-primary/80 underline ml-1" href="https://dataweb.usitc.gov/classification/commodity-translation" target="_blank" rel="noreferrer">
              dataweb.usitc.gov/classification/commodity-translation
            </a>
          </AlertDescription>
        </Alert>
      </Card>

      <AdcvdSearchCard />

      <Ustr301Explorer />
    </div>
  );
}
