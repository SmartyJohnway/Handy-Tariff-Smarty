import * as cheerio from 'cheerio';

/**
 * 摰儔敺?Federal Register HTML 銝剛圾???貊?????瑽? */
export interface CompanyRate {
  company: string;
  rate: string; // normalized numeric string if possible (e.g., "0.71"), falls back to raw text
}

/**
 * 敺?Federal Register ??隞?HTML ?批捆銝剛圾? AD/CVD ?砍蝔?銵具? * @param htmlContent - 敺?body_html_url ?脣???HTML 摮葡?? * @returns 閫??敺??砍蝔????嚗??銝???喟征????? */
export function parseCompanyRatesFromHtml(htmlContent: string): CompanyRate[] {
  if (!htmlContent) {
    return [];
  }

  const $ = cheerio.load(htmlContent);
  const results: CompanyRate[] = [];

  const tableKeywords = [
    'Exporter', 'Producer', 'Company',
    'Dumping', 'Margin', 'Weighted-Average',
    'Subsidy', 'Cash Deposit', 'Rate'
  ];

  let targetTables: any | null = null;

  const finalResultsHeader = $('h2, h3').filter((_i: any, el: any) => {
    const text = $(el).text().toLowerCase();
    return text.includes('final weighted-average')
      || text.includes('final results of')
      || text.includes('amended final results')
      || text.includes('final determination');
  }).first();

  if (finalResultsHeader.length > 0) {
    targetTables = finalResultsHeader.nextAll('table').first();
  }

  if (!targetTables || targetTables.length === 0) {
    targetTables = $('table');
  }

  targetTables.each((_i: any, table: any) => {
    const tableHtml = $(table).html();
    if (!tableHtml) {
        return;
    }
    if (!tableKeywords.some(keyword => tableHtml.toLowerCase().includes(keyword.toLowerCase()))) {
      return;
    }

    let companyIndex = -1;
    let rateIndex = -1;
    let usedFirstTbodyAsHeader = false;

    const findHeaderIndices = (headerRow: any) => {
      headerRow.find('th, td').each((index: any, headerCell: any) => {
        const headerText = $(headerCell).text().trim().toLowerCase();
        if (headerText.includes('exporter') || headerText.includes('producer') || headerText.includes('company')) {
          companyIndex = index;
        }
        if (
          headerText.includes('margin') || headerText.includes('rate') ||
          headerText.includes('cash deposit') || headerText.includes('weighted')
        ) {
          rateIndex = index;
        }
      });
    };

    const theadRow = $(table).find('thead tr');
    if (theadRow.length > 0) {
      findHeaderIndices(theadRow);
    }
    
    if (companyIndex === -1 || rateIndex === -1) {
      const firstTbodyRow = $(table).find('tbody tr:first-child');
      if (firstTbodyRow.length > 0) {
        findHeaderIndices(firstTbodyRow);
        if (companyIndex !== -1 && rateIndex !== -1) {
            usedFirstTbodyAsHeader = true;
        }
      }
    }

    if (companyIndex === -1 || rateIndex === -1) {
      return;
    }

    let bodyRows = $(table).find('tbody tr');
    if (usedFirstTbodyAsHeader) {
        bodyRows = bodyRows.slice(1);
    }
    
    bodyRows.each((_j: any, row: any) => {
      const columns = $(row).find('td');
      if (columns.length > Math.max(companyIndex, rateIndex)) {
        const rawCompany = $(columns[companyIndex]).text().trim();
        const rawRate = $(columns[rateIndex]).text().trim();

        const company = normalizeCompany(rawCompany);
        const rate = normalizeRate(rawRate);

        if (company && rate) {
          results.push({ company, rate });
        }
      }
    });
  });

  let uniqueResults = Array.from(new Map(results.map(item => [item.company, item])).values());

  // Fallback for "All Others" and "Non-Selected Companies" from paragraphs
  if (results.length === 0) {
    const text = $('body').text() || '';
    const allOthersMatch = text.match(/(?:All|all)[-\s]Others[^\d%]*([0-9]+(?:\.[0-9]+)?)\s*(?:%|percent)/i);
    if (allOthersMatch) {
      uniqueResults.push({ company: 'All Others', rate: allOthersMatch[1] });
    }
    
    const nonSelectedMatch = text.match(/Non-Selected Companies[^\d%]*([0-9]+(?:\.[0-9]+)?)\s*(?:%|percent)/i);
    if (nonSelectedMatch) {
        uniqueResults.push({ company: 'Non-Selected Companies', rate: nonSelectedMatch[1] });
    }
  }
  
  // Final deduplication after paragraph fallbacks
  uniqueResults = Array.from(new Map(uniqueResults.map(item => [item.company, item])).values());

  return uniqueResults;
}

function normalizeCompany(name: string): string {
      if (!name) return '';
      // Cheerio's .text() method handles <sup> tags by converting them to their text content.
      // This function cleans up the resulting string.
      let c = name
        .replace(/[\r\n]+/g, ' ')      // Replace newlines with a single space
        .replace(/\s+/g, ' ')          // Collapse multiple whitespace characters
        .replace(/\[\d+\]/g, '')       // Remove bracketed footnotes like [1]
        .replace(/[\*†‡]/gu, '')       // Remove common footnote symbols
        .replace(/\d+$/g, '')          // Remove trailing footnote digits
        .replace(/,$/, '')             // Remove trailing commas
        .trim();
    
      // Standardize common group names
      const lower = c.toLowerCase();
      if (lower.includes('companies not selected for individual examination') || lower.includes('non-selected companies')) {
        return 'Non-Selected Companies';
      }
      if (lower.includes('all others')) {
        return 'All Others';
      }
      return c;
    }

function normalizeRate(raw: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  if (lower === 'n/a' || lower === 'na' || lower === 'not applicable' || lower === '-') return '';
  
  // Match floating point or integer numbers, optionally followed by a percent sign
  const m = lower.match(/([0-9]+\.?[0-9]*)/);
  
  // Only return the number if a match is found, otherwise return an empty string
  return m ? m[1] : '';
}

// Detect special cases where programmatic rate extraction is not appropriate
// Returns 'rescission' when the review is rescinded; 'clerical_correction' for corrections; otherwise null
export function detectFrSpecialCase(htmlContent: string): 'rescission' | 'clerical_correction' | null {
  if (!htmlContent) return null;
  const lower = htmlContent.toLowerCase();
  if (lower.includes('rescission') && (lower.includes('review') || lower.includes('administrative review') || lower.includes('sunset'))) {
    return 'rescission';
  }
  if (lower.includes('clerical error') || lower.includes('correction of clerical')) {
    return 'clerical_correction';
  }
  return null;
}



