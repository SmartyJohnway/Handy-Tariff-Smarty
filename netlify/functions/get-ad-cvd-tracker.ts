import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import type { UnifiedTariff, InvestigationTag } from "@/models/unified";
import { normalizeResults, normalizeFRDoc, NormalizedFRDoc } from "@/lib/frNormalize";
import { getFunctionsBaseUrl } from "./utils/netlify";

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const MAX_SEARCH_TERMS_PER_COUNTRY = 12;

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

function getDocScore(title: string): number {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('amended final')) return 7;
    if (lowerTitle.includes('final results') && lowerTitle.includes('administrative review')) return 6;
    if (lowerTitle.includes('final determination')) return 5;
    if (lowerTitle.includes('preliminary')) return 4;
    if (lowerTitle.includes('initiation')) return 3;
    if (lowerTitle.includes('changed circumstances')) return 2;
    if (lowerTitle.includes('sunset review')) return 1;
    return 0;
}

function normalizeBooleanOperators(input: string): string {
    return input.replace(/\bAND\b/gi, '&').replace(/\bOR\b/gi, '|');
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
    const functionsBase = getFunctionsBaseUrl(event);
    const qs = event.queryStringParameters || {};
    const htsCode = qs['hts_code'];
    const year = qs['year'] || new Date().getFullYear().toString();
    const perPage = parseInt(String(qs['per_page'] || '50'), 10) || 50;
    const chunkSize = parseInt(String(qs['chunk_size'] || '5'), 10) || 5;
    const debugSearch = (qs['debug'] || 'false') === 'true';
    const debugFind = (qs['debug_find'] || qs['debugFind'] || qs['debug'] || 'false') === 'true';
    const legalTerms = normalizeBooleanOperators(String(qs['legalTerms'] || '("Final Results of Administrative Review" | "Amended Final Results" | "Final Determination")'));
    const agenciesParam = String(qs['agencies'] || 'international-trade-administration');
    const typeParam = String(qs['type'] || 'RULE,NOTICE');
    const agencyFilters = agenciesParam.split(',').map(a => a.trim()).filter(Boolean);
    const typeFilters = typeParam.split(',').map(t => t.trim()).filter(Boolean);

    if (!htsCode) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameter: hts_code" }) };
    }

    const cacheKey = `adcvd-country-latest-${htsCode}-${year}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' }, body: JSON.stringify(cached.data) };
    }
    if (cached) cache.delete(cacheKey);

    try {
        const allFoundDocsForDebug: any[] = [];

        // Step 1: Get Rich Clues from get-investigations service
        const investigationsRes = await fetchWithTimeout(`${functionsBase}/get-investigations?year=${year}&hts8=${encodeURIComponent(htsCode)}`);
        if (!investigationsRes.ok) {
            throw new Error(`Failed to fetch data from get-investigations: ${investigationsRes.status}`);
        }
        const investigations: InvestigationTag[] = await investigationsRes.json();

        if (investigations.length === 0) {
            const payload = { updatedAt: new Date().toISOString(), countries: [], idsLinks: [] };
            cache.set(cacheKey, { data: payload, timestamp: Date.now() });
            return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
        }

        // Step 2: Group investigations by country, collecting product titles and case numbers
        const countryToInvestigations = new Map<string, { productTitles: Set<string>, caseNumbers: Set<string> }>();
        for (const inv of investigations) {
            if (!inv.countries || inv.countries.length === 0) continue;
            for (const country of inv.countries) {
                const existing = countryToInvestigations.get(country) || { productTitles: new Set<string>(), caseNumbers: new Set<string>() };
                if (inv.productTitle) {
                    existing.productTitles.add(inv.productTitle);
                }
                if (inv.caseNumbers) {
                    inv.caseNumbers.forEach(n => existing.caseNumbers.add(n));
                }
                countryToInvestigations.set(country, existing);
            }
        }

        // Step 3 & 4: For each country, perform targeted FR search and select the best document
        const countryDocs: Record<string, { latest: any; score: number }> = {};

        const fetchDocumentDetails = async (country: string, docNumber: string): Promise<NormalizedFRDoc | null> => {
            const findUrl = new URL(`${functionsBase}/fr-ts-find`);
            findUrl.searchParams.set('document_number', docNumber);
            if (debugFind) findUrl.searchParams.set('debug', '1');
            const requestUrl = findUrl.toString();
            try {
                const resp = await fetchWithTimeout(requestUrl);
                const payload = await resp.json().catch(() => ({}));
                const adapterMode = payload?.adapter_mode || '';
                const xcache = resp.headers.get('x-cache') || '';
                if (!resp.ok) {
                    allFoundDocsForDebug.push({ kind: 'find', country, document_number: docNumber, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache });
                    return null;
                }
                const normalized = normalizeFRDoc(payload);
                allFoundDocsForDebug.push({ kind: 'find', country, document_number: docNumber, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache, has_detail: normalized ? 1 : 0 });
                return normalized;
            } catch (error: any) {
                allFoundDocsForDebug.push({ kind: 'find', country, document_number: docNumber, url: requestUrl, error: String(error?.message || error) });
                return null;
            }
        };

        for (const [country, { productTitles, caseNumbers }] of countryToInvestigations.entries()) {
            let bestDocForCountry: { latest: any; score: number } | null = null;

            // Build a prioritized list of search terms
            const searchTerms: string[] = [];
            caseNumbers.forEach(num => {
                searchTerms.push(`("${num}") & ${legalTerms}`);
                searchTerms.push(`"${num}"`);
            });
            productTitles.forEach(pTitle => {
                searchTerms.push(`("${pTitle}") & ${legalTerms}`);
            });

            const uniqueTerms = Array.from(new Set(searchTerms)).slice(0, MAX_SEARCH_TERMS_PER_COUNTRY);

            // New Strategy: Chunking & Parallelization
            if (uniqueTerms.length > 0) {
                const chunks: string[][] = [];
                for (let i = 0; i < uniqueTerms.length; i += chunkSize) {
                    chunks.push(uniqueTerms.slice(i, i + chunkSize));
                }

                const fetchChunk = async (term: string) => {
                    const searchUrl = new URL(`${functionsBase}/fr-ts-search`);
                    searchUrl.searchParams.set('conditions[term]', term);
                    searchUrl.searchParams.set('per_page', String(perPage));
                    searchUrl.searchParams.set('order', 'newest');
                    searchUrl.searchParams.set('highlight', 'true');
                    if (debugSearch) searchUrl.searchParams.set('debug', '1');
                    agencyFilters.forEach((ag) => searchUrl.searchParams.append('conditions[agencies][]', ag));
                    typeFilters.forEach((tf) => searchUrl.searchParams.append('conditions[type][]', tf));

                    const requestUrl = searchUrl.toString();
                    try {
                        const resp = await fetchWithTimeout(requestUrl);
                        const payload = await resp.json().catch(() => ({}));
                        const adapterMode = payload?.adapter_mode || '';
                        const xcache = resp.headers.get('x-cache') || '';
                        if (!resp.ok) {
                            allFoundDocsForDebug.push({ kind: 'search', country, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache, count: 0 });
                            return [];
                        }
                        const normalized = normalizeResults(payload);
                        allFoundDocsForDebug.push({ kind: 'search', country, url: requestUrl, status: resp.status, adapter_mode: adapterMode, x_cache: xcache, count: normalized.length });
                        return normalized;
                    } catch (error: any) {
                        allFoundDocsForDebug.push({ kind: 'search', country, url: requestUrl, error: String(error?.message || error) });
                        return [];
                    }
                };

                const fetchPromises = chunks.map(chunk => {
                    const combinedTerm = chunk.map(t => `(${t})`).join(' | ');
                    if (!combinedTerm) return Promise.resolve([]);
                    return fetchChunk(combinedTerm);
                });

                const responses = await Promise.allSettled(fetchPromises);
                let allDocuments: any[] = [];

                for (const response of responses) {
                    if (response.status === 'fulfilled' && Array.isArray(response.value)) {
                        allDocuments.push(...response.value);
                    }
                }

                const uniqueDocuments = Array.from(new Map(allDocuments.map(doc => [doc.document_number, doc])).values());
                const docsForThisCountry = uniqueDocuments;

                for (const doc of docsForThisCountry) {
                    const currentDocScore = getDocScore(doc.title);
                    if (currentDocScore === 0) continue;

                    const newDoc = {
                        title: doc.title,
                        url: doc.html_url,
                        date: doc.publication_date,
                        document_number: doc.document_number,
                        body_html_url: doc.body_html_url ?? null,
                        pdf_url: doc.pdf_url ?? null,
                        public_inspection_pdf_url: doc.public_inspection_pdf_url ?? null,
                        full_text_xml_url: doc.full_text_xml_url ?? undefined,
                        raw_text_url: doc.raw_text_url ?? undefined,
                        toc_subject: doc.toc_subject ?? undefined,
                        toc_doc: doc.toc_doc ?? undefined,
                        agencies: doc.agencies,
                        agencies_text: doc.agencies_text,
                        abstract: doc.abstract,
                        excerpts: doc.excerpts,
                    };

                    if (!bestDocForCountry || currentDocScore > bestDocForCountry.score || (currentDocScore === bestDocForCountry.score && new Date(newDoc.date).getTime() > new Date(bestDocForCountry.latest.date).getTime())) {
                        bestDocForCountry = { latest: newDoc, score: currentDocScore };
                    }
                }
            }

            if (bestDocForCountry) {
                const detail = await fetchDocumentDetails(country, bestDocForCountry.latest.document_number);
                if (detail) {
                    bestDocForCountry.latest = {
                        ...bestDocForCountry.latest,
                        title: detail.title || bestDocForCountry.latest.title,
                        url: detail.html_url || bestDocForCountry.latest.url,
                        date: detail.publication_date || bestDocForCountry.latest.date,
                        document_number: detail.document_number || bestDocForCountry.latest.document_number,
                        body_html_url: detail.body_html_url ?? null,
                        pdf_url: detail.pdf_url ?? null,
                        public_inspection_pdf_url: detail.public_inspection_pdf_url ?? null,
                        full_text_xml_url: detail.full_text_xml_url ?? undefined,
                        raw_text_url: detail.raw_text_url ?? undefined,
                        toc_subject: detail.toc_subject ?? undefined,
                        toc_doc: detail.toc_doc ?? undefined,
                        agencies: detail.agencies?.length ? detail.agencies : bestDocForCountry.latest.agencies,
                        agencies_text: detail.agencies_text || bestDocForCountry.latest.agencies_text,
                        abstract: detail.abstract || bestDocForCountry.latest.abstract,
                        excerpts: detail.excerpts?.length ? detail.excerpts : bestDocForCountry.latest.excerpts,
                    };
                }
                countryDocs[country] = bestDocForCountry;
            }
        }

        // Step 5: Aggregate and Return
        const countries = Object.keys(countryDocs).sort().map(c => ({
            country: c,
            hasCase: true,
            latest: countryDocs[c].latest,
        }));

        const allIdsLinks = investigations
            .filter(inv => inv.url)
            .map(inv => ({ title: inv.title, url: inv.url }));

        const uniqueIdsLinks = Array.from(new Map(allIdsLinks.map(item => [item.url, item])).values());

        const payload = {
            updatedAt: new Date().toISOString(),
            countries,
            idsLinks: uniqueIdsLinks,
            debug_found_docs: allFoundDocsForDebug
        };

        cache.set(cacheKey, { data: payload, timestamp: Date.now() });

        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };

    } catch (err: any) {
        return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
    }

};
