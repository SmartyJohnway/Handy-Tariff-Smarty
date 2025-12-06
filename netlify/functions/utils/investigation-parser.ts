import type { InvestigationTag } from '../models/unified';

type InvestigationTypes = NonNullable<InvestigationTag['types']>;

// Define interfaces for Dataweb API response structure
export interface DatawebInvestigation {
  investigationNumber: string;
  phase?: string;
  caseId?: string | number;
  investigationId?: number;
  investigationTitle?: string;
}

// Helper function to classify investigation types from the title string
export function classifyTypesFromTitle(title: string): InvestigationTypes {
  const t = title.toLowerCase();

  // Supports formats like 701-405 / 701-TA-405 / 731–TA–899 (with various dash types)
  const has701 = /\b701(?:\s*-\s*ta)?\s*[-–—]\s*\d+\b/i.test(title);
  const has731 = /\b731(?:\s*-\s*ta)?\s*[-–—]\s*\d+\b/i.test(title);

  // 337 titles often have 337-TA-#### or just "Section 337"
  const has337 = /\b337\s*-\s*ta\s*[-–—]?\s*\d+\b/i.test(title) || /section\s*337\b/i.test(t);

  // 201 titles often have TA-201-## or just "Section 201" or "safeguard(s)"
  const has201 = /\b(?:ta\s*-\s*)?201\s*[-–—]\s*\d+\b/i.test(title) || /section\s*201\b|safeguard\b/i.test(t);

  const types: InvestigationTypes = [];
  if (has701) types.push("CVD");
  if (has731) types.push("AD");
  if (has201) types.push("201");
  if (has337) types.push("337");
  return types;
}

export function dedupeInvestigations(list: DatawebInvestigation[] = []): DatawebInvestigation[] {
  const seen = new Set<string>();
  return list.filter(x => {
    const key = `${x.investigationId}|${x.investigationNumber}|${x.phase}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeInvestigations(investigations?: DatawebInvestigation[]): InvestigationTag[] {
  const cleanList = dedupeInvestigations(investigations);

  return cleanList.map(inv => {
    const title = inv.investigationTitle || '';
    const num = inv.investigationNumber || '';

    // 1. Construct authoritative URL
    const url = (inv.caseId && inv.investigationId)
      ? `https://ids.usitc.gov/case/${inv.caseId}/investigation/${inv.investigationId}`
      : undefined;

    // 2. Extract countries from title
    const countryMatch = title.match(/from\s+(.*?)(?:\s+Inv\. Nos?\.|$)/i);
    let countries: string[] = [];
    if (countryMatch && countryMatch[1]) {
        const countryString = countryMatch[1].trim().replace(/;$/, '').trim();
        countries = countryString.split(/, and|,/g).map(c => c.trim()).filter(c => c);
    }

    // 3. Classify types from title
    let types: InvestigationTypes = classifyTypesFromTitle(title);
    if (types.length === 0) {
        if (num.startsWith('701')) types.push('CVD');
        else if (num.startsWith('731')) types.push('AD');
        else if (/^A-/.test(num)) types.push('AD');
        else if (/^C-/.test(num)) types.push('CVD');
        else if (num.startsWith('201')) types.push('201');
        else if (num.startsWith('337')) types.push('337');
    }
    if (types.length === 0) {
        types.push('Other');
    }

    // 4. Extract Product Title and Case Numbers (Final Corrected Logic v2)
    const productTitleMatch = title.match(/^(.*?)\s+from/i);
    const productTitle = productTitleMatch ? productTitleMatch[1].trim().replace(/,$/, '') : title;

    const caseNumbers = new Set<string>();
    if (num) {
        caseNumbers.add(num);
    }

    const blockMatch = title.match(/Inv\. Nos?\. (.*?) \(/);
    if (blockMatch && blockMatch[1]) {
        const block = blockMatch[1];
        const allTokens = block.replace(/\s+and\s+/gi, ', ').split(/,\s*/).map(t => t.trim()).filter(t => t);

        let currentPrefix = '';
        for (const token of allTokens) {
            if (/-TA-/.test(token)) { // It's a full number or a number with a range
                currentPrefix = token.substring(0, token.indexOf('-TA-') + 4); // e.g., "731-TA-"
                
                const rangeMatch = token.match(/(\d+)-(\d+)$/);
                if (rangeMatch) {
                    const base = token.substring(0, token.lastIndexOf(rangeMatch[0]));
                    const start = parseInt(rangeMatch[1], 10);
                    const end = parseInt(rangeMatch[2], 10);
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            caseNumbers.add(`${base}${i}`);
                        }
                    }
                } else {
                    caseNumbers.add(token);
                }
            } else if (currentPrefix && /^\d+(-\d+)?$/.test(token)) { // It's a number or range without prefix
                if (token.includes('-')) {
                    const [start, end] = token.split('-').map(n => parseInt(n, 10));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            caseNumbers.add(`${currentPrefix}${i}`);
                        }
                    }
                } else {
                    caseNumbers.add(`${currentPrefix}${token}`);
                }
            }
        }
    }

    return {
      number: num,
      phase: inv.phase,
      types: types as InvestigationTag['types'],
      // convenience single type for downstream consumers/tests
      type: types[0] || 'Other',
      title: title,
      productTitle: productTitle,
      caseNumbers: Array.from(caseNumbers),
      countries: countries,
      url: url
    };
  });
}
