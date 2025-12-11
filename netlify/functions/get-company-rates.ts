import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { parseCompanyRatesFromHtml, detectFrSpecialCase } from "@/utils/fr-adcvd-parser";
import { normalizeFind, NormalizedFRDoc } from "@/lib/frNormalize";
import { getFunctionsBaseUrl } from "./utils/netlify";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
    const functionsBase = getFunctionsBaseUrl(event);
    const qs = event.queryStringParameters || {};
    const document_number = qs['document_number'];
    const debug = (qs['debug'] || 'false') === 'true';

    if (!document_number) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameter: document_number" }) };
    }

    const cacheKey = `company-rates-${document_number}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Cache-Hit': 'true' }, body: JSON.stringify(cached.data) };
    }
    if (cached) cache.delete(cacheKey);

    try {
        const docUrl = new URL(`${functionsBase}/fr-ts-find`);
        docUrl.searchParams.set('document_number', document_number);
        if (debug) docUrl.searchParams.set('debug', '1');

        const docRes = await fetch(docUrl.toString());
        const docJson = await docRes.json().catch(() => ({}));
        const adapterMode = docJson?.adapter_mode || '';
        if (!docRes.ok) {
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode },
                body: JSON.stringify({ error: `Failed to fetch document details for ${document_number} from fr-ts-find`, adapter_mode: adapterMode })
            };
        }

        const normalizedDoc = normalizeFind(docJson) as NormalizedFRDoc | null;
        if (!normalizedDoc) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode },
                body: JSON.stringify({ error: `Document ${document_number} not found or missing required fields.`, adapter_mode: adapterMode })
            };
        }

        const htmlUrl = normalizedDoc.body_html_url;

        if (!htmlUrl) {
            const payload = {
                special_case: 'pdf_only',
                message: 'HTML body URL not available for this document.',
                html_url: normalizedDoc.html_url,
                publication_date: normalizedDoc.publication_date,
                adapter_mode: adapterMode
            };
            cache.set(cacheKey, { data: payload, timestamp: Date.now() });
            return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode }, body: JSON.stringify(payload) };
        }

        const htmlRes = await fetch(htmlUrl);
        if (!htmlRes.ok) {
            return { statusCode: 502, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode }, body: JSON.stringify({ error: 'Failed to fetch HTML content.', special_case: 'pdf_only', adapter_mode: adapterMode }) };
        }
        const htmlContent = await htmlRes.text();

        if (htmlContent.includes("full text of this document is currently available in PDF format")) {
            const payload = { special_case: 'pdf_only', message: 'This document is only available in PDF or text format.', html_url: normalizedDoc.html_url, publication_date: normalizedDoc.publication_date, adapter_mode: adapterMode };
            cache.set(cacheKey, { data: payload, timestamp: Date.now() });
            return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode }, body: JSON.stringify(payload) };
        }

        const companyRatesRaw = parseCompanyRatesFromHtml(htmlContent);
        const special = detectFrSpecialCase(htmlContent);
        if (special && companyRatesRaw.length === 0) {
            const payload = { special_case: special, html_url: normalizedDoc.html_url, publication_date: normalizedDoc.publication_date, adapter_mode: adapterMode };
            cache.set(cacheKey, { data: payload, timestamp: Date.now() });
            return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode }, body: JSON.stringify(payload) };
        }

        // Extract heading near results section (Preliminary/Final Results ...)
        const headingMatchTag = htmlContent.match(/<(h[1-6])[^>]*>\s*([^<]*(?:preliminary\s+results|final\s+results)[^<]*)<\/\1>/i);
        const plainText = htmlContent.replace(/<[^>]+>/g, ' ');
        const headingMatchText = headingMatchTag
            ? headingMatchTag[2]
            : (plainText.match(/((?:preliminary|final)\s+results[^.]{0,160}?review)/i)?.[1] || null);
        const headingText = headingMatchText ? headingMatchText.replace(/\s+/g, ' ').trim() : null;

        // Extract period info like "exists for the period January 1, 2022, through December 31, 2022"
        const periodMatch = (() => {
            const patterns = [
                /(?:exist|exists)\s+for\s+the\s+period\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})[\s\S]{0,80}?(?:-|to|through|thru|\u2013|\u2014|\u2012|\u2011|\u2010)\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
                /for\s+the\s+period\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})[\s\S]{0,80}?(?:-|to|through|thru|\u2013|\u2014|\u2012|\u2011|\u2010)\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
                /([A-Za-z]+\s+\d{1,2},\s+\d{4})[\s\S]{0,80}?(?:-|to|through|thru|\u2013|\u2014|\u2012|\u2011|\u2010)\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})[\s\S]{0,24}?(?:period|review|results)/i,
            ];
            for (const p of patterns) {
                const m = htmlContent.match(p) || plainText.match(p);
                if (m) return m;
            }
            return null;
        })();
        const period = periodMatch ? { start: periodMatch[1], end: periodMatch[2] } : null;
        const periodText = periodMatch ? periodMatch[0].replace(/\s+/g, ' ').trim() : null;

        const companyRates = companyRatesRaw.map((r: any) => ({
            company: r.company,
            rate: r.rate,
            unit: 'percent',
            rate_text: r.rate ? `${r.rate}%` : '',
        }));

        const payload = {
            document_number,
            publication_date: normalizedDoc.publication_date,
            title: normalizedDoc.title,
            source_url: normalizedDoc.html_url,
            body_html_url: normalizedDoc.body_html_url,
            pdf_url: normalizedDoc.pdf_url,
            public_inspection_pdf_url: normalizedDoc.public_inspection_pdf_url,
            rates: companyRates,
            period_start: period?.start || null,
            period_end: period?.end || null,
            period_text: periodText,
            heading_text: headingText,
            adapter_mode: adapterMode
        };
        cache.set(cacheKey, { data: payload, timestamp: Date.now() });

        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode }, body: JSON.stringify(payload) };

    } catch (err: any) {
        return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
    }
};
