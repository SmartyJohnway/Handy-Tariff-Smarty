import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { load as cheerioLoad } from 'cheerio';
import { normalizeResults, normalizeFRDoc, NormalizedFRDoc } from "../../src/lib/frNormalize";
import { getFunctionsBaseUrl } from "./utils/netlify";

type ScoreTerm = {
  pattern: string;
  score: number;
  type?: 'contains' | 'regex';
  and?: string[];
};

type ScoreWeights = {
  terms: ScoreTerm[];
  bonus?: { has_body_html?: number; has_rate_table?: number };
};

const DEFAULT_WEIGHTS: ScoreWeights = {
  terms: [
    { pattern: 'amended final', score: 7, type: 'contains' },
    { pattern: 'final results', score: 6, type: 'contains', and: ['administrative review'] },
    { pattern: 'final determination', score: 5, type: 'contains' },
    { pattern: 'preliminary', score: 4, type: 'contains' },
    { pattern: 'initiation', score: 3, type: 'contains' },
    { pattern: 'changed circumstances', score: 2, type: 'contains' },
    { pattern: 'sunset review', score: 1, type: 'contains' },
  ],
  bonus: { has_body_html: 0.5, has_rate_table: 1.0 }
};

const RATE_TABLE_DEFAULT = {
  companyHeaders: ['company', 'exporter', 'manufacturer'],
  rateHeaders: ['rate', 'margin', 'assessment']
};

function norm(s?: string) { return (s || '').toLowerCase(); }

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);
  const res = await fetch(url, { signal: ac.signal as any });
  clearTimeout(to);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.json();
}

function scoreTitle(title: string, weights: ScoreWeights) {
  const t = norm(title);
  let best = 0;
  const matched: string[] = [];
  for (const term of (weights.terms || [])) {
    if (term.type === 'regex') {
      try {
        const re = new RegExp(term.pattern, 'i');
        if (re.test(title)) {
          best = Math.max(best, term.score);
          matched.push(`/${term.pattern}/i:${term.score}`);
        }
      } catch {}
    } else {
      const ok = t.includes(term.pattern.toLowerCase()) && (!term.and || term.and.every(a => t.includes(a.toLowerCase())));
      if (ok) {
        best = Math.max(best, term.score);
        matched.push(`${term.pattern}${term.and? "+"+term.and.join("+") : ''}:${term.score}`);
      }
    }
  }
  return { score: best, matched };
}

async function checkHasRateTable(htmlUrl: string, heur = RATE_TABLE_DEFAULT, timeoutMs = 8000) {
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(htmlUrl, { signal: ac.signal as any });
    clearTimeout(to);
    if (!res.ok) return { has_rate_table: false, matched_headers: [] as string[] };
    const html = await res.text();
    const $ = cheerioLoad(html);
    const matched: string[] = [];
    let found = false;
    $('table').each((_, el) => {
      if (found) return;
      const headers = new Set<string>();
      // collect header texts (th) or first row tds
      $(el).find('th').each((__, th) => { headers.add(norm($(th).text())); });
      if (headers.size === 0) {
        const firstRow = $(el).find('tr').first();
        firstRow.find('td').each((__, td) => { headers.add(norm($(td).text())); });
      }
      const hasCompany = Array.from(headers).some(h => heur.companyHeaders.some(ch => h.includes(ch)));
      const hasRate = Array.from(headers).some(h => heur.rateHeaders.some(rh => h.includes(rh)));
      if (hasCompany && hasRate) {
        matched.push(...Array.from(headers));
        found = true;
      }
    });
    return { has_rate_table: found, matched_headers: matched.slice(0, 20) };
  } catch {
    return { has_rate_table: false, matched_headers: [] as string[] };
  }
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const qs = event.queryStringParameters || {};
  const functionsBase = getFunctionsBaseUrl(event);
  const hts_code = qs['hts_code'] || '';
  const year = qs['year'] || new Date().getFullYear().toString();
  const agencies = qs['agencies'] || 'international-trade-administration';
  const type = qs['type'] || 'RULE,NOTICE';
  const per_page = parseInt(String(qs['per_page'] || '20'), 10) || 20;
  const chunk_size = parseInt(String(qs['chunk_size'] || '10'), 10) || 10;
  const legalTerms = qs['legalTerms'] || '("Final Results of Administrative Review" | "Amended Final Results" | "Final Determination")';
  const enableScoring = (qs['enableScoring'] || 'true') === 'true';
  const addTableSignals = (qs['addTableSignals'] || 'true') === 'true';
  const tableCheckMode = (qs['tableCheckMode'] || 'topN') as 'none'|'topN'|'all';
  const tableCheckTopN = parseInt(String(qs['tableCheckTopN'] || '3'), 10) || 3;
  const fetchCap = parseInt(String(qs['fetchCap'] || '12'), 10) || 12; // total FR fetches cap across all countries
  const tableCheckCap = parseInt(String(qs['tableCheckCap'] || '10'), 10) || 10; // total HTML checks cap
  const perCountryMin = parseInt(String(qs['perCountryMin'] || '1'), 10) || 1; // fairness: minimum fetches per country
  const includeCountry = (qs['includeCountry'] || 'false') === 'true';
  const countryBroadcast = ((qs['countryBroadcast'] || 'false') === 'true') || ((qs['countryBroadcast'] || '') === 'on');
  const facetsParam = String(qs['facets'] || '');
  const facets = facetsParam.split(',').map((s) => s.trim()).filter(Boolean);
  const typeFilters = String(type || '').split(',').map((s) => s.trim()).filter(Boolean);
  const agencyFilters = String(agencies || '').split(',').map((s) => s.trim()).filter(Boolean);
  let customTerms: Array<{phrase:string; exact?:boolean; andFinal?:boolean; country?: string}> = [];
  if (qs['customTerms']) { try { customTerms = JSON.parse(String(qs['customTerms'])); } catch {} }

  let scoreWeights: ScoreWeights = DEFAULT_WEIGHTS;
  if (qs['scoreWeights']) {
    try { scoreWeights = JSON.parse(qs['scoreWeights']); } catch {}
  }

  if (!hts_code) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'verifier:company-rates' }, body: JSON.stringify({ error: 'Missing hts_code' }) };
  }

  try {
    // 1) Investigations from dataweb-adapter
    const dwUrl = `${functionsBase}/dataweb-adapter?year=${encodeURIComponent(year)}&hts8=${encodeURIComponent(hts_code)}`;
    const datawebData = await fetchJsonWithTimeout(dwUrl) as any;
    const investigations: any[] = Array.isArray(datawebData?.investigations) ? datawebData.investigations : [];
    if (investigations.length === 0) {
      const payload = { input: { hts_code, year }, investigations: [], grouped: {}, constructed_terms: {}, chunks: {}, fetches: [], raw_documents: {}, output: { countries: [], idsLinks: [], docHtmlLinks: {} } };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'verifier:company-rates' }, body: JSON.stringify(payload) };
    }

    // 2) Group by country
    const grouped: Record<string, { productTitles: string[], caseNumbers: string[] }> = {};
    for (const inv of investigations) {
      const countries: string[] = Array.isArray(inv.countries) ? inv.countries : [];
      for (const c of countries) {
        if (!grouped[c]) grouped[c] = { productTitles: [], caseNumbers: [] };
        if (inv.productTitle) grouped[c].productTitles.push(String(inv.productTitle));
        if (Array.isArray(inv.caseNumbers)) grouped[c].caseNumbers.push(...inv.caseNumbers.map((x: any) => String(x)));
      }
    }

    // 3) Construct terms and chunks (custom terms + includeCountry)
    const constructed_terms: Record<string, string[]> = {};
    const chunks: Record<string, string[]> = {};
    const buildTerm = (phrase: string, exact?: boolean, andFinal?: boolean, country?: string) => {
      const p = exact ? `"${phrase}"` : phrase;
      const parts: string[] = [p];
      if (andFinal) parts.push('Final Results');
      if (includeCountry && country) parts.push(`"${country}"`);
      return parts.join(' & ');
    };
    if (Array.isArray(customTerms) && customTerms.length > 0) {
      for (const c of Object.keys(grouped)) constructed_terms[c] = [];
      for (const t of customTerms) {
        const tgt = (t.country && t.country !== 'all') ? t.country : null;
        if (tgt && constructed_terms[tgt] !== undefined) {
          constructed_terms[tgt].push(buildTerm(t.phrase, t.exact, t.andFinal, tgt));
        } else if ((t.country === 'all') || countryBroadcast) {
          for (const c of Object.keys(constructed_terms)) {
            constructed_terms[c].push(buildTerm(t.phrase, t.exact, t.andFinal, c));
          }
        } else {
          // skip if target country not present and no broadcast
        }
      }
      for (const [c, terms] of Object.entries(constructed_terms)) {
        const cs: string[] = [];
        for (let i = 0; i < terms.length; i += chunk_size) {
          const combined = terms.slice(i, i + chunk_size).map(t => `(${t})`).join(' | ');
          if (combined) cs.push(combined);
        }
        chunks[c] = cs;
      }
    } else {
      for (const [country, grp] of Object.entries(grouped)) {
        const terms: string[] = [];
        (grp.productTitles || []).forEach(p => terms.push(`${buildTerm(p, true, true, country)} & ${legalTerms}`));
        (grp.caseNumbers || []).forEach(n => {
          terms.push(`${buildTerm(n, true, true, country)} & ${legalTerms}`);
          terms.push(buildTerm(n, true, false, country));
        });
        constructed_terms[country] = terms;
        const cs: string[] = [];
        for (let i = 0; i < terms.length; i += chunk_size) {
          const combined = terms.slice(i, i + chunk_size).map(t => `(${t})`).join(' | ');
          if (combined) cs.push(combined);
        }
        chunks[country] = cs;
      }
    }

    // 4) Fetch FR documents per chunk
  const fetches: any[] = [];
  const raw_documents: Record<string, any[]> = {};
    // Fair round-robin with per-country minimum
    let totalFetches = 0;
    const countryKeys = Object.keys(chunks);
    const countryIndices: Record<string, number> = {};
    const countryDocs: Record<string, any[]> = {};
    for (const c of countryKeys) { countryIndices[c] = 0; countryDocs[c] = []; }

  async function fetchOne(country: string, term: string) {
      const searchUrl = new URL(`${functionsBase}/fr-ts-search`);
      searchUrl.searchParams.set('conditions[term]', term);
      searchUrl.searchParams.set('per_page', String(per_page));
      searchUrl.searchParams.set('highlight', 'true');
      searchUrl.searchParams.set('order', 'newest');
      if (facets.length) searchUrl.searchParams.set('facets', facets.join(','));
      if (typeFilters.length) {
        typeFilters.forEach((tf) => searchUrl.searchParams.append('conditions[type][]', tf));
      }
      if (agencyFilters.length) {
        agencyFilters.forEach((ag) => searchUrl.searchParams.append('conditions[agencies][]', ag));
      }
      const debugSearch = (qs['debug'] || 'false') === 'true';
      if (debugSearch) searchUrl.searchParams.set('debug', '1');
      const requestUrl = searchUrl.toString();
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        const resp = await fetch(requestUrl, { signal: ac.signal as any });
        clearTimeout(to);
        totalFetches++;
        const payload = await resp.json().catch(() => ({}));
        const adapterMode = payload?.adapter_mode || '';
        const xcache = resp.headers.get('X-Cache') || '';
        if (!resp.ok) {
          fetches.push({ country, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache, count: 0 });
          return;
        }
        const arr = normalizeResults(payload);
        countryDocs[country].push(...arr);
        fetches.push({ country, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache, count: arr.length });
      } catch (e: any) {
        fetches.push({ country, url: requestUrl, error: String(e?.message || e) });
      }
    }

    // Phase 1: ensure perCountryMin for each country where possible
    let progressed = true;
    for (let round = 0; round < perCountryMin && totalFetches < fetchCap; round++) {
      progressed = false;
      for (const c of countryKeys) {
        if (totalFetches >= fetchCap) break;
        const idx = countryIndices[c];
        const list = chunks[c] || [];
        if (idx < list.length) {
          await fetchOne(c, list[idx]);
          countryIndices[c] = idx + 1;
          progressed = true;
        }
      }
      if (!progressed) break; // no more terms
    }

    // Phase 2: round-robin remaining until fetchCap
    while (totalFetches < fetchCap) {
      progressed = false;
      for (const c of countryKeys) {
        if (totalFetches >= fetchCap) break;
        const idx = countryIndices[c];
        const list = chunks[c] || [];
        if (idx < list.length) {
          await fetchOne(c, list[idx]);
          countryIndices[c] = idx + 1;
          progressed = true;
        }
      }
      if (!progressed) break; // all exhausted
    }

    // Deduplicate per country
    for (const c of countryKeys) {
      const map = new Map<string, any>();
      for (const d of countryDocs[c]) { if (d && d.document_number) map.set(d.document_number, d); }
      raw_documents[c] = Array.from(map.values());
    }

    // 5) Optional feature extraction (table signals)
    const findCap = Math.min(200, Math.max(per_page * fetchCap, 25));
    const debugFind = (qs['debug'] || 'false') === 'true';
    const docDetailCache: Record<string, NormalizedFRDoc> = {};
    let findCount = 0;

    async function enrichDoc(doc: NormalizedFRDoc): Promise<NormalizedFRDoc> {
      if (!doc?.document_number) return doc;
      if (docDetailCache[doc.document_number]) return docDetailCache[doc.document_number];
      if (findCount >= findCap) return doc;
      const url = new URL(`${functionsBase}/fr-ts-find`);
      url.searchParams.set('document_number', doc.document_number);
      if (debugFind) url.searchParams.set('debug', '1');
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        const resp = await fetch(url.toString(), { signal: ac.signal as any });
        clearTimeout(to);
        if (!resp.ok) return doc;
        const payload = await resp.json().catch(() => ({}));
        const detail = normalizeFRDoc(payload);
        if (!detail) return doc;
        const merged: NormalizedFRDoc = {
          ...doc,
          ...detail,
          excerpts: detail.excerpts?.length ? detail.excerpts : doc.excerpts,
          agencies: detail.agencies?.length ? detail.agencies : doc.agencies,
          agencies_text: detail.agencies_text || doc.agencies_text,
          abstract: detail.abstract || doc.abstract,
        };
        docDetailCache[doc.document_number] = merged;
        findCount++;
        return merged;
      } catch {
        return doc;
      }
    }

    for (const country of countryKeys) {
      const sanitized: NormalizedFRDoc[] = [];
      for (const doc of raw_documents[country] || []) {
        const detailed = await enrichDoc(doc);
        sanitized.push(detailed);
      }
      raw_documents[country] = sanitized;
    }

    const features: Record<string, Record<string, any>> = {};
    if (addTableSignals) {
      let checked = 0;
      for (const [country, docs] of Object.entries(raw_documents)) {
        features[country] = {};
        const toCheck = tableCheckMode === 'all' ? docs : tableCheckMode === 'topN' ? docs.slice(0, tableCheckTopN) : [];
        for (const d of toCheck) {
          if (checked >= tableCheckCap) break;
          const has_body_html = !!d.body_html_url;
          let has_rate_table = false; let matched_headers: string[] = [];
          if (has_body_html) {
            const r = await checkHasRateTable(d.body_html_url);
            has_rate_table = r.has_rate_table; matched_headers = r.matched_headers;
          }
          features[country][d.document_number] = {
            has_body_html,
            has_rate_table,
            matched_headers,
            body_html_url: d.body_html_url,
            full_text_xml_url: d.full_text_xml_url,
            raw_text_url: d.raw_text_url,
            toc_subject: d.toc_subject,
            toc_doc: d.toc_doc,
          };
          checked++;
        }
      }
    }

    // 6) Scoring / selection
    const candidates_per_country: any[] = [];
    const selected_per_country: Record<string, any> = {};
    if (enableScoring) {
      for (const [country, docs] of Object.entries(raw_documents)) {
        let best: any = null;
        for (const d of docs) {
          const { score, matched } = scoreTitle(d.title || '', scoreWeights);
          let s = score;
          const f = features?.[country]?.[d.document_number] || {};
          if (scoreWeights.bonus?.has_body_html && f.has_body_html) s += scoreWeights.bonus.has_body_html;
          if (scoreWeights.bonus?.has_rate_table && f.has_rate_table) s += scoreWeights.bonus.has_rate_table;
          candidates_per_country.push({ country, doc: d, score: s, matched_rules: matched, bonus: { has_body_html_bonus: f.has_body_html ? (scoreWeights.bonus?.has_body_html || 0) : 0, has_rate_table_bonus: f.has_rate_table ? (scoreWeights.bonus?.has_rate_table || 0) : 0 } });
          if (!best || s > best.score || (s === best.score && new Date(d.publication_date || 0).getTime() > new Date(best.doc.publication_date || 0).getTime())) {
            best = { doc: d, score: s };
          }
        }
        if (best) selected_per_country[country] = { latest: { title: best.doc.title, url: best.doc.html_url, date: best.doc.publication_date, document_number: best.doc.document_number }, score: best.score };
      }
    }

    // 7) Final output
    const countries = Object.keys(raw_documents).sort().map(c => {
      const latest = selected_per_country[c]?.latest || null;
      return { country: c, hasCase: !!latest, latest };
    });
    const idsLinksArr = (investigations || []).filter((inv: any) => inv.url).map((inv: any) => ({ title: inv.title, url: inv.url }));
    const idsLinks = Array.from(new Map(idsLinksArr.map((x: any) => [x.url, x])).values());
    const docHtmlLinks: Record<string, string> = {};
    for (const list of Object.values(raw_documents)) {
      for (const d of list) { if (d?.document_number && d?.html_url) docHtmlLinks[d.document_number] = d.html_url; }
    }

    const body = {
      input: { hts_code, year, agencies, type, per_page, chunk_size, legalTerms, includeCountry, countryBroadcast, enableScoring, addTableSignals, tableCheckMode, tableCheckTopN, perCountryMin, fetchCap, tableCheckCap, scoreWeights, customTerms },
      investigations,
      grouped,
      legalTerms,
      constructed_terms,
      chunks,
      fetches,
      raw_documents,
      features,
      scoring: enableScoring ? { rule: scoreWeights, candidates_per_country, selected_per_country } : null,
      output: { countries, idsLinks, docHtmlLinks }
    };

    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'verifier:company-rates' }, body: JSON.stringify(body) };

  } catch (e: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'verifier:company-rates' }, body: JSON.stringify({ error: e?.message || 'internal_error' }) };
  }
};
