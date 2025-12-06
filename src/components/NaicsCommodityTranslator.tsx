import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCommodityTranslationMutation } from '@/hooks/mutations/useCommodityTranslationMutation';

type Props = {
  initialHts8?: string;
  initialYear?: string;
  onResult?: (payload: { raw: any; naics6: string[] }) => void;
};

const NaicsCommodityTranslator: React.FC<Props> = ({
  initialHts8 = '',
  initialYear = String(new Date().getFullYear()),
  onResult,
}) => {
  const [hts8, setHts8] = useState(initialHts8);
  const [year, setYear] = useState(initialYear);
  const [error, setError] = useState<string | null>(null);
  const [naicsOptions, setNaicsOptions] = useState<string[]>([]);
  const [raw, setRaw] = useState<any | null>(null);
  const translationMutation = useCommodityTranslationMutation();

  const normalizeNaics = (data: any): string[] => {
    const a1 = Array.isArray(data?.imports) ? data.imports : [];
    const a2 = Array.isArray(data?.exports) ? data.exports : [];
    const imp = data?.import;
    const exp = data?.export;
    const listImp = Array.isArray(imp?.list) ? imp.list : [];
    const listExp = Array.isArray(exp?.list) ? exp.list : [];
    const classesImp: string[] = Array.isArray(imp?.classifications) ? imp.classifications : [];
    const classesExp: string[] = Array.isArray(exp?.classifications) ? exp.classifications : [];

    const naicKey = (arr: string[]) => {
      const up = arr.map((s) => String(s).toUpperCase());
      const idxA = up.indexOf('NAICS');
      if (idxA >= 0) return idxA;
      return up.indexOf('NAIC');
    };
    const idxImp = naicKey(classesImp);
    const idxExp = naicKey(classesExp);

    const codes = new Set<string>();
    for (const r of ([] as any[]).concat(a1, a2)) {
      const buckets = (r?.naics || r?.NAICS || r?.naic || []) as any[];
      for (const n of Array.isArray(buckets) ? buckets : []) {
        const rawCode = (n?.code ?? n?.id ?? '').toString();
        const c = rawCode.replace(/\D/g, '').slice(0, 6);
        if (c.length === 6) codes.add(c);
      }
    }
    if (idxImp >= 0) {
      for (const row of listImp) {
        if (Array.isArray(row) && row.length > idxImp) {
          const c = String(row[idxImp] ?? '').replace(/\D/g, '').slice(0, 6);
          if (c.length === 6) codes.add(c);
        }
      }
    }
    if (idxExp >= 0) {
      for (const row of listExp) {
        if (Array.isArray(row) && row.length > idxExp) {
          const c = String(row[idxExp] ?? '').replace(/\D/g, '').slice(0, 6);
          if (c.length === 6) codes.add(c);
        }
      }
    }

    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  };

  const runTranslate = async () => {
    try {
      setError(null);
      setNaicsOptions([]);
      setRaw(null);

      const clean = String(hts8 || '').replace(/\D/g, '').slice(0, 10);
      if (!clean) throw new Error('請輸入 8 或 10 碼 HTS');
      const y = String(year || new Date().getFullYear());

      const data = await translationMutation.mutateAsync({ hts8: clean, year: y });

      const options = normalizeNaics(data);
      setNaicsOptions(options);
      setRaw(data);
      onResult?.({ raw: data, naics6: options });
    } catch (e: any) {
      setError(e?.message || '翻譯發生錯誤');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground" htmlFor="hts8">HTS (8/10 碼)</label>
          <Input id="hts8" value={hts8} onChange={(e) => setHts8(e.target.value)} placeholder="例如 73063800 或 7306380020" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground" htmlFor="year">年度</label>
          <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" placeholder="2025" />
        </div>
        <Button onClick={runTranslate} disabled={translationMutation.isPending}>
          {translationMutation.isPending ? '查詢中…' : 'HTS 對 NAICS 翻譯'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {naicsOptions.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm text-foreground">辨識出的 NAICS 六碼（已去重）：</div>
          <div className="flex flex-wrap gap-2">
            {naicsOptions.map(code => (
              <span key={code} className="px-2 py-1 rounded border text-xs font-mono bg-background text-foreground">{code}</span>
            ))}
          </div>
        </div>
      )}

      {raw && (
        <details className="mt-2">
          <summary className="text-sm text-muted-foreground cursor-pointer">檢視原始回應（翻譯 API）</summary>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(raw, null, 2)}</pre>
        </details>
      )}

      <div className="text-xs text-muted-foreground">
        資料來源：/api/dataweb-adapter?translation=commodity（POST），行為與 DataWeb 官方工具一致。
      </div>
    </div>
  );
};

export default NaicsCommodityTranslator;
