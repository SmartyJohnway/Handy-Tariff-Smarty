import type { Handler } from '@netlify/functions';
import { loadUstr301, analyzeEightDigitAmbiguity } from './utils/ustr-section301';

export const handler: Handler = async () => {
  try {
    const rows = await loadUstr301();
    if (!rows || rows.length === 0) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: 'USTR rows not found or empty' }, null, 2) };
    }

    const total = rows.length;
    const byLen: Record<string, number> = { '8': 0, '10': 0 };
    const listCounts: Record<string, number> = {};
    const rateCounts: Record<string, number> = {};
    let effectiveParsed = 0;

    for (const r of rows) {
      byLen[String(r.hts_len)] = (byLen[String(r.hts_len)] || 0) + 1;
      const listKey = String(r.list ?? 'null');
      listCounts[listKey] = (listCounts[listKey] || 0) + 1;
      const rateKey = String(r.max_rate_text ?? 'null');
      rateCounts[rateKey] = (rateCounts[rateKey] || 0) + 1;
      if (r.effective_date) effectiveParsed += 1;
    }

    // Ambiguity over 8-digit prefixes
    const seen8 = new Set<string>();
    let ambiguousCount = 0;
    const ambiguousSamples: any[] = [];
    for (const r of rows) {
      const base8 = r.hts_digits.substring(0, 8);
      if (seen8.has(base8)) continue;
      seen8.add(base8);
      const amb = analyzeEightDigitAmbiguity(base8, rows);
      if (amb.ambiguous) {
        ambiguousCount += 1;
        if (ambiguousSamples.length < 5) {
          ambiguousSamples.push({ base8, samples: (amb.samples || []).map(s => ({ hts: s.hts_digits, rate: s.max_rate_text, list: s.list })) });
        }
      }
    }

    const out = {
      success: true,
      record_generated_at: new Date().toISOString(),
      total_rows: total,
      by_code_length: byLen,
      list_counts: listCounts,
      rate_counts: rateCounts,
      effective_date_parsed: effectiveParsed,
      effective_date_parse_rate: +(effectiveParsed / total).toFixed(4),
      eight_digit_prefixes: seen8.size,
      ambiguous_8digit_prefixes: ambiguousCount,
      ambiguous_ratio: +(ambiguousCount / Math.max(seen8.size, 1)).toFixed(4),
      samples: {
        ambiguous_8digit: ambiguousSamples,
        first_rows: rows.slice(0, 3).map(r => ({ hts: r.hts_digits, list: r.list, rate: r.max_rate_text, effective: r.effective_date }))
      }
    };

    return { statusCode: 200, body: JSON.stringify(out, null, 2) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: err?.message || 'Internal error' }, null, 2) };
  }
};

