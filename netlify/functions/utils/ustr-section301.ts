import fs from 'fs/promises';
import path from 'path';

type UstrRaw = {
  HTS_id: number | string;
  description: string;
  action_description: string;
  note?: string;
};

export type UstrParsed = {
  hts_digits: string; // 8 or 10 digits
  hts_len: 8 | 10;
  description: string;
  list: string | null; // '1' | '2' | '3' | '4' | '4A' | null
  max_rate_text: string | null; // e.g., '25%'
  effective_date: string | null; // ISO 'YYYY-MM-DD' when parsable
  note?: string;
  raw?: UstrRaw;
};

const monthMap: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
};

function toIsoDate(monthName: string, dayStr: string, yearStr: string | null): string | null {
  const mm = monthMap[(monthName || '').toLowerCase()];
  if (!mm) return null;
  const ddNum = parseInt(dayStr || '', 10);
  const dd = isFinite(ddNum) ? String(ddNum).padStart(2, '0') : null;
  if (!dd) return null;
  if (!yearStr) return null;
  const yyyy = yearStr.length === 2 ? ('20' + yearStr) : yearStr;
  if (!/^\d{4}$/.test(yyyy)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function parseActionDescription(action: string): { list: string | null; max_rate_text: string | null; effective_date: string | null } {
  const s = String(action || '');
  // List: prefer explicit "List X" (allow 4A)
  let list: string | null = null;
  const mList = s.match(/\bList\s*(\d+|4A)\b/i);
  if (mList) list = mList[1].toUpperCase();

  // Rate: pick first percentage like 25%, 7.5%, 0.0%, 100%
  let max_rate_text: string | null = null;
  const mRate = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (mRate) max_rate_text = `${mRate[1]}%`;

  // Year hint may appear as "in 2025" or similar
  let yearHint: string | null = null;
  const mYear = s.match(/\b(20\d{2})\b/);
  if (mYear) yearHint = mYear[1];

  // Effective date commonly inside parentheses: (September 24, 2018) or (January 1)
  // Try Month Day, Year
  let effective_date: string | null = null;
  const mFull = s.match(/\(([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\)/);
  if (mFull) {
    effective_date = toIsoDate(mFull[1], mFull[2], mFull[3]);
  } else {
    // Try Month Day (year from hint)
    const mMD = s.match(/\(([A-Za-z]+)\s+(\d{1,2})\)/);
    if (mMD && yearHint) {
      effective_date = toIsoDate(mMD[1], mMD[2], yearHint);
    }
  }

  return { list, max_rate_text, effective_date };
}

// Resolve project roots similar to other utils
const candidateRoots = (): string[] => {
  const roots: string[] = [];
  try { roots.push(path.resolve(__dirname, '..', '..', '..', '..')); } catch {}
  try { roots.push(path.resolve(__dirname, '..', '..', '..')); } catch {}
  try { roots.push(process.cwd()); } catch {}
  try { roots.push(path.resolve(process.cwd(), '..')); } catch {}
  try { roots.push(path.resolve(process.cwd(), 'TariffHTSUSearcher')); } catch {}
  return Array.from(new Set(roots));
};

const firstExistingPath = (...segments: string[]): string | null => {
  for (const root of candidateRoots()) {
    const p = path.join(root, ...segments);
    try {
      require('fs').accessSync(p);
      return p;
    } catch {}
  }
  return null;
};

let cache: { rows: UstrParsed[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function loadUstr301(): Promise<UstrParsed[] | null> {
  const now = Date.now();
  if (cache && (now - cache.timestamp) < CACHE_TTL_MS) return cache.rows;
  // Try multiple locations / casings: assets/..., public/assets/..., and lowercase file name.
  const p =
    firstExistingPath('assets', 'data', 'USTR_HTS_section301.json') ||
    firstExistingPath('assets', 'data', 'ustr_hts_section301.json') ||
    firstExistingPath('public', 'assets', 'data', 'USTR_HTS_section301.json') ||
    firstExistingPath('public', 'assets', 'data', 'ustr_hts_section301.json');
  if (!p) return null;
  try {
    const raw = await fs.readFile(p, 'utf8');
    const json = JSON.parse(raw) as UstrRaw[];
    const rows: UstrParsed[] = [];
    for (const r of json) {
      const idStr = String((r as any).HTS_id ?? '').replace(/\D/g, '');
      if (!/^\d{8,10}$/.test(idStr)) continue;
      const hts_digits = idStr.padEnd(idStr.length, '0').substring(0, idStr.length);
      const hlen = (hts_digits.length >= 10 ? 10 : 8) as 8 | 10;
      const { list, max_rate_text, effective_date } = parseActionDescription((r as any).action_description || '');
      rows.push({
        hts_digits,
        hts_len: hlen,
        description: (r as any).description || '',
        list: list || null,
        max_rate_text: max_rate_text || null,
        effective_date: effective_date || null,
        note: (r as any).note || undefined,
        raw: r,
      });
    }
    cache = { rows, timestamp: now };
    return rows;
  } catch {
    return null;
  }
}

export function longestPrefixMatch(htsCode: string, rows: UstrParsed[]): UstrParsed | null {
  const q = String(htsCode || '').replace(/\D/g, '');
  if (!q) return null;
  let best: UstrParsed | null = null;
  let longest = 0;
  for (const r of rows) {
    const d = r.hts_digits;
    if (q.startsWith(d) && d.length > longest) { best = r; longest = d.length; }
  }
  return best;
}

export function analyzeEightDigitAmbiguity(hts8Digits: string, rows: UstrParsed[]): { ambiguous: boolean; samples?: UstrParsed[] } {
  const base = hts8Digits.replace(/\D/g, '').substring(0,8);
  const scope = rows.filter(r => r.hts_digits.startsWith(base));
  if (scope.length <= 1) return { ambiguous: false };
  // Distinct rate set across 8/10-digit children
  const rates = new Set(scope.map(r => (r.max_rate_text || '').trim()));
  if (rates.size > 1) return { ambiguous: true, samples: scope.slice(0, 3) };
  // If only one rate but it's empty somewhere
  if (rates.has('') || rates.has(null as any)) return { ambiguous: true, samples: scope.slice(0, 3) };
  return { ambiguous: false };
}
