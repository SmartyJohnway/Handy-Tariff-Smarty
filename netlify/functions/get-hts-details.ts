import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { loadUstr301, longestPrefixMatch, analyzeEightDigitAmbiguity } from "./utils/ustr-section301";
import type { UnifiedTariff } from "./models/unified";
import { getFunctionsBaseUrl } from "./utils/netlify";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

const fetchWithTimeout = async (input: string | URL, init?: RequestInit, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Fetch timed out after ${timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const functionsBase = getFunctionsBaseUrl(event);
  const qs = event.queryStringParameters || {};
  const htsCode = qs['hts_code'] || null;
  const year = qs['year'] || new Date().getFullYear().toString();

  if (!htsCode) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing required parameter: hts_code' }) };
  }

  const cacheKey = `hts-details-${year}-${htsCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' }, body: JSON.stringify(cached.data) };
  }
  if (cached) cache.delete(cacheKey);

  try {
    const [baselineRes, datawebRes, programsLookupRes, ustrRows] = await Promise.all([
      fetchWithTimeout(`${functionsBase}/baseline-adapter?year=${year}&hts8=${encodeURIComponent(htsCode)}`),
      fetchWithTimeout(`${functionsBase}/dataweb-adapter?year=${year}&hts8=${encodeURIComponent(htsCode)}`),
      fetchWithTimeout(`${functionsBase}/get-program-names`),
      loadUstr301()
    ]);

    if (!baselineRes.ok) {
        const errorText = await baselineRes.text();
        throw new Error(`Baseline adapter fetch failed: ${baselineRes.status}. ${errorText}`);
    }
    if (!datawebRes.ok) {
        const errorText = await datawebRes.text();
        throw new Error(`Dataweb adapter fetch failed: ${datawebRes.status}. ${errorText}`);
    }

    const baselineData: UnifiedTariff = await baselineRes.json();
    const datawebData: UnifiedTariff = await datawebRes.json();

    let programLookupMap: Record<string, string> = {};
    let enrichedBaselinePrograms = baselineData.programs;

    if (programsLookupRes.ok) {
        const programsLookup = await programsLookupRes.json();
        if (programsLookup && programsLookup.programs) {
            programLookupMap = programsLookup.programs.reduce((acc: Record<string, string>, p: any) => {
                acc[p.code] = p.description;
                return acc;
            }, {});
            enrichedBaselinePrograms = baselineData.programs?.map(p => ({
                ...p,
                desc: programLookupMap[p.code] || undefined,
            }));
        }
    }

    const merged: Partial<UnifiedTariff> = {
      ...baselineData,
      programs: enrichedBaselinePrograms,
      source: 'aggregator',
      extra_duties: baselineData.extra_duties || {},
      description: datawebData.description || baselineData.description,
      effectiveDate: datawebData.effectiveDate,
      endDate: datawebData.endDate,
      investigations: datawebData.investigations,
      tradeStats: datawebData.tradeStats,
      globalVars: datawebData.globalVars,
      systemAlerts: datawebData.systemAlerts,
      staged_rates: datawebData.staged_rates || baselineData.staged_rates,
      programs_dataweb: datawebData.programs,
      fetched_at: new Date().toISOString(),
    };

    const deriveActionTitle = (raw?: any): string | undefined => {
      const ad = raw?.action_description ? String(raw.action_description) : '';
      if (!ad) return undefined;
      const dashParts = ad.split(/\s[\u2013\-]\s/);
      if (dashParts[0]) return dashParts[0].trim() || undefined;
      const mParen = ad.match(/\(([^)]+)\)/);
      if (mParen && mParen[1]) return mParen[1].trim();
      return ad.trim() || undefined;
    };

    const queryDigits = String(htsCode || '').replace(/[^0-9]/g, '');
    if (Array.isArray(ustrRows) && ustrRows.length > 0 && queryDigits) {
      const assignS301 = (hit: any) => {
        merged.extra_duties = merged.extra_duties ?? {};
        merged.extra_duties.s301 = {
          max_rate_text: hit.max_rate_text,
          source: {
            name: `USTR Section 301${hit.list ? ` (List ${hit.list})` : ''}`,
            url: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/search',
            effective: hit.effective_date || undefined,
            action_title: deriveActionTitle(hit.raw),
          },
        };
      };

      if (queryDigits.length >= 10) {
        const hit = longestPrefixMatch(queryDigits, ustrRows);
        if (hit) assignS301(hit);
      } else if (queryDigits.length >= 8) {
        const base8 = queryDigits.substring(0, 8);
        const amb = analyzeEightDigitAmbiguity(base8, ustrRows);
        if (!amb.ambiguous) {
          const hit = longestPrefixMatch(base8, ustrRows);
          if (hit) assignS301(hit);
        }
      }
    }

    cache.set(cacheKey, { data: merged, timestamp: Date.now() });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) };

  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};
