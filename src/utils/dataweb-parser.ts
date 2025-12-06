import { get } from 'lodash-es';
import type { RateText, ProgramRate } from '../models/unified';

// The target normalized schema.
export interface NormalizedData {
  description: string | null;
  hts8: string | null;
  effectiveDate: string | null;
  endDate: string | null;
  statisticalUOM: string | null;
  mfnRate: RateText | null;
  col2Rate: RateText | null;
  specialRateText: string | null;
  programs: ProgramRate[];
  measures: any[];
}

/**
 * Parses the merged response from the tariff-aggregator into a structured, normalized format.
 * This parser prioritizes top-level, pre-merged data and falls back to raw sources if needed.
 * @param mergedData The entire 'merged' object from the tariff-aggregator response.
 * @returns A normalized data object.
 */
export function parseDatawebResponse(mergedData: any): Partial<NormalizedData> {
  if (!mergedData) {
    return {};
  }

  // --- Measures (AD/CVD, 232, 301) ---
  const measures: any[] = [];
  const seenInvestigations = new Set<string>();

  // 1. Prioritize top-level extra_duties for 232/301
  if (mergedData.extra_duties?.s232) {
    measures.push({
      type: 'NationalSecurity232',
      source: 'Presidential Proclamation',
      dutyText: get(mergedData, 'extra_duties.s232.max_rate_text', 'See Chapter 99 / FR notice'),
      source_url: get(mergedData, 'extra_duties.s232.source.url')
    });
  }
  if (mergedData.extra_duties?.s301) {
    measures.push({
      type: 'UnfairPractices301',
      source: 'USTR',
      dutyText: get(mergedData, 'extra_duties.s301.max_rate_text', 'See Chapter 99 / FR notice'),
      source_url: get(mergedData, 'extra_duties.s301.source.url')
    });
  }

  // 1b. Also detect 232/301 from text clues in raw.sections/notes when extra_duties is missing
  try {
    const sections = get(mergedData, 'dataweb.raw.sections', get(mergedData, 'raw.sections', [])) as any[];
    const allTexts: string = (sections || [])
      .flatMap((s: any) => [s?.id, ...(s?.children || []).map((c: any) => c?.value || c?.id)])
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!mergedData.extra_duties?.s232 && /section\s*232|proclamation\s*232|9903\.81|9903\.85|u\.s\.\s*note\s*(16|19)/i.test(allTexts)) {
      measures.push({
        type: 'NationalSecurity232',
        source: 'Text Clue',
        dutyText: 'See Chapter 99 / FR notice',
      });
    }
    if (!mergedData.extra_duties?.s301 && /section\s*301|9903\.88|9903\.90|9903\.91|9903\.92|u\.s\.\s*note\s*(20|31)/i.test(allTexts)) {
      measures.push({
        type: 'UnfairPractices301',
        source: 'Text Clue',
        dutyText: 'See Chapter 99 / FR notice',
      });
    }
  } catch {}

  // 2. Parse AD/CVD from the top-level investigations array
  const invList = Array.isArray(mergedData.investigations)
    ? mergedData.investigations
    : get(mergedData, 'raw.investigations', []);
  if (Array.isArray(invList)) {
    for (const inv of invList) {
      const key = `${inv.investigationId}-${inv.investigationNumber}-${inv.investigationTitle}`;
      if (seenInvestigations.has(key)) continue;
      seenInvestigations.add(key);

      const num = (inv.investigationNumber || '').toUpperCase();
      let type = null;

      if (/^701/.test(num)) type = 'CVD';
      else if (/^731/.test(num)) type = 'AD';
      else if (/^201/.test(num)) type = 'Safeguard201';

      if (type) {
        measures.push({
          type: type,
          source: 'USITC',
          investigationNumber: inv.investigationNumber,
          title: inv.investigationTitle,
          phase: inv.phase,
          caseId: inv.caseId,
          hts10: inv.hts10,
        });
      }
    }
  }


  // --- Main Data Normalization ---
  const normalized: Partial<NormalizedData> = {
    // Prioritize top-level merged description, fall back to raw baseline.
    description: get(mergedData, 'description', get(mergedData, 'baseline.raw.description', get(mergedData, 'raw.desc', null))),
    
    // HTS code from baseline or top-level
    hts8: get(mergedData, 'baseline.hts8', get(mergedData, 'hts8', get(mergedData, 'raw.hts8', null))),

    // Rates: Get directly from the baseline adapter's raw output for reliability.
    // Try baseline first; fallback to dataweb/raw sections.mfn_text
    mfnRate: get(mergedData, 'baseline.raw.general',
      (get(mergedData, 'dataweb.raw.sections', get(mergedData, 'raw.sections', [])) as any[])
        .find((s: any) => s.id === 'tariff_treatment')?.children?.find((c: any) => c.id === 'mfn')?.children?.find((c: any) => c.id === 'mfn_text')?.value ?? null
    ),
    col2Rate: get(mergedData, 'baseline.raw.other', null),
    specialRateText: get(mergedData, 'baseline.raw.special', null),

    // Other info: Get from the dataweb adapter's raw output.
    effectiveDate: (get(mergedData, 'dataweb.raw.sections', get(mergedData, 'raw.sections', [])) as any[])
      .find((s: any) => s.id === 'tariff_treatment')?.children?.find((c: any) => c.id === 'bed')?.value || null,
    endDate: (get(mergedData, 'dataweb.raw.sections', get(mergedData, 'raw.sections', [])) as any[])
      .find((s: any) => s.id === 'tariff_treatment')?.children?.find((c: any) => c.id === 'eed')?.value || null,
    statisticalUOM: (get(mergedData, 'dataweb.raw.sections', get(mergedData, 'raw.sections', [])) as any[])
      .find((s: any) => s.id === 'tariff_treatment')?.children?.find((c: any) => c.id === 'uoq1')?.value || null,
    
    // Use top-level programs if available
    programs: get(mergedData, 'programs', []),
    
    // The measures we just built
    measures,
  };

  return normalized;
}
