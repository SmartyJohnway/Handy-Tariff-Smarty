import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Document, Client, FederalRegister, DocumentAgencyFacet, DocumentSectionFacet, DocumentTopicFacet, DocumentTypeFacet, DocumentDailyFacet, DocumentWeeklyFacet, DocumentQuarterlyFacet, DocumentMonthlyFacet } from "./fr-ts-microservices/src";
import { buildParams } from "./fr-ts-microservices/src/utilities";

function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as T;
}

function sanitizeQuery(qs: Record<string, string | undefined>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(qs || {})) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

// 從 rawUrl 正規化 bracket 與多值陣列（支援 conditions[*][] 與 fields[]）
function parseFromSearchParams(sp: URLSearchParams): { nested: Record<string, any>; simple: Record<string, any> } {
  const nested: Record<string, any> = {};
  const simple: Record<string, any> = {};

  const setPath = (obj: any, path: string[], value: any, forceArrayAtLeaf: boolean) => {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in cur) || typeof cur[key] !== 'object' || cur[key] === null) cur[key] = {};
      cur = cur[key];
    }
    const leaf = path[path.length - 1];
    if (forceArrayAtLeaf) {
      if (!Array.isArray(cur[leaf])) cur[leaf] = [];
      cur[leaf].push(value);
      return;
    }
    if (cur[leaf] === undefined) cur[leaf] = value;
    else if (Array.isArray(cur[leaf])) cur[leaf].push(value);
    else cur[leaf] = [cur[leaf], value];
  };

  const keys = new Set<string>();
  sp.forEach((_, k) => keys.add(k));

  for (const key of keys) {
    const values = sp.getAll(key);
    // Accept keys with trailing empty [] (e.g., conditions[agencies][]) as bracketed
    const isBracket = /^[^\[]+(?:\[[^\]]*\])+$/i.test(key);
    if (isBracket) {
      // Extract parts between brackets, e.g. 'conditions[agencies][]' => ['conditions','agencies']
      const parts = (key.match(/[^\[\]]+/g) || []).filter(Boolean) as string[];
      if (parts.length === 0) continue;
      const root = parts[0]! as string;
      const sub = parts.slice(1); // may be empty
      const forceArray = key.endsWith('[]');
      for (const raw of values) {
        const chunks = String(raw).split(',').map(s => s.trim()).filter(Boolean);
        const targetPath = [root, ...sub];
        if (chunks.length === 0) setPath(nested, targetPath, '', forceArray);
        else if (chunks.length === 1) setPath(nested, targetPath, chunks[0], forceArray);
        else chunks.forEach(c => setPath(nested, targetPath, c, forceArray));
      }
    } else if (key === 'fields' || key === 'fields[]') {
      const flat = values.flatMap(v => String(v).split(',').map(s => s.trim())).filter(Boolean);
      const uniq = Array.from(new Set(flat));
      if (uniq.length) simple['fields'] = uniq;
    } else {
      simple[key] = values.length ? values[values.length - 1] : '';
    }
  }

  return { nested, simple };
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    let sp: URLSearchParams;
    try { sp = new URL(event.rawUrl).searchParams; } catch { sp = new URLSearchParams(); }

    const baseUri = sp.get('base_uri') || qs["base_uri"] || undefined;
    const mode = (sp.get('mode') || qs["mode"] || "document").toLowerCase();
    const facetsParam = sp.get('facets') || qs["facets"] || ""; // e.g., "agency,daily"
    const debug = ((sp.get('debug') || "").toLowerCase() === '1' || (sp.get('debug') || "").toLowerCase() === 'true');

    if (baseUri) Client.overrideBaseUri(baseUri);

    const { nested, simple } = parseFromSearchParams(sp);
    // Normalize common array-like conditions if provided as CSV
    if (nested && nested.conditions) {
      const normCsv = (v: any) => Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',').map(s=>s.trim()).filter(Boolean) : v);
      if (nested.conditions.agencies !== undefined) nested.conditions.agencies = normCsv(nested.conditions.agencies);
      if (nested.conditions.sections !== undefined) nested.conditions.sections = normCsv(nested.conditions.sections);
      if (nested.conditions.type !== undefined) nested.conditions.type = normCsv(nested.conditions.type);
      if (nested.conditions.topics !== undefined) nested.conditions.topics = normCsv(nested.conditions.topics);
    }
    const per_page = simple["per_page"] ? Number(simple["per_page"]) : undefined;
    const page = simple["page"] ? Number(simple["page"]) : undefined;
    const order = simple["order"];
    const fields = Array.isArray(simple['fields']) ? simple['fields'] : undefined;

    let payload: any;

    const hasConditions = nested && nested.conditions && Object.keys(nested.conditions).length > 0;
    const queryTerm = hasConditions ? undefined : (simple["term"] || undefined);

    if (mode === "aggregated" || (facetsParam && facetsParam.length > 0)) {
      const facets = (facetsParam || "").split(",").map(s => s.trim()).filter(Boolean);
      let docQuery: any = {
        term: queryTerm,
        conditions: hasConditions ? nested.conditions : undefined,
        per_page,
        page,
        order,
        ...(Array.isArray(fields) && fields.length ? { fields } : {}),
      };
      docQuery = pruneUndefined(docQuery);

      const useVendorAggregator = (process.env.FR_TS_USE_VENDOR_AGG === '1');
      if (useVendorAggregator) {
        const aggQuery: any = { ...docQuery, facets };
        const resp = await FederalRegister.search(aggQuery);
        payload = {
          count: resp.documents.count,
          total_pages: resp.documents.total_pages,
          results: resp.documents.results.map((d: any) => d?.attributes ?? d),
          facets: Object.fromEntries(Object.entries(resp.facets || {}).map(([k, v]: any) => [k, {
            count: v.count,
            total_pages: v.total_pages,
            results: v.results?.map((x: any) => x?.attributes ?? x) ?? [],
          }])),
          adapter_mode: "ts-aggregated",
        };

        if (debug) {
          try {
            const docUrl = new URL(Client.BASE_URI + '/documents.json');
            const docParams = new URLSearchParams();
            Object.entries(docQuery).forEach(([k, v]) => buildParams(docParams, k, v as any));
            docUrl.search = docParams.toString();
            const facetUrls: Record<string, string> = {};
            for (const f of facets) {
              const fUrl = new URL(Client.BASE_URI + `/documents/facets/${f}`);
              const fParams = new URLSearchParams();
              // facets 查詢不帶 fields
              Object.entries({ ...docQuery, fields: undefined }).forEach(([k, v]) => buildParams(fParams, k, v as any));
              fUrl.search = fParams.toString();
              facetUrls[f] = fUrl.toString();
            }
            const debugCond = hasConditions ? { ...nested.conditions } : undefined;
            if (debugCond) {
              const toArr = (v: any) => Array.isArray(v) ? v : (v !== undefined && v !== null ? [v] : v);
              if (debugCond.agencies !== undefined) debugCond.agencies = toArr(debugCond.agencies);
              if (debugCond.sections !== undefined) debugCond.sections = toArr(debugCond.sections);
              if (debugCond.type !== undefined) debugCond.type = toArr(debugCond.type);
              if (debugCond.topics !== undefined) debugCond.topics = toArr(debugCond.topics);
            }
            (payload as any).__debug = {
              documents_url: docUrl.toString(),
              facet_urls: facetUrls,
              effective_query: {
                term: docQuery.term,
                conditions: debugCond,
                per_page: docQuery.per_page,
                page: docQuery.page,
                order: docQuery.order,
                fields: docQuery.fields,
                facets,
              },
              received: {
                raw_url: event.rawUrl,
                raw_querystring: (()=>{ try { return new URL(event.rawUrl).search; } catch { return ''; } })(),
                nested,
                simple,
              },
            };
          } catch (e: any) {
            try { (payload as any).__debug = { error: String(e?.message || e) }; } catch {}
          }
        }
      } else {
        // Documents
        const docResultSet = await Document.search(docQuery);

      // Facets (exclude fields param)
      let facetQuery: any = {
        term: queryTerm,
        conditions: hasConditions ? nested.conditions : undefined,
        per_page,
        page,
        order,
      };
      facetQuery = pruneUndefined(facetQuery);
      const facetMap: Record<string, any> = {
        agency: DocumentAgencyFacet,
        section: DocumentSectionFacet,
        topic: DocumentTopicFacet,
        type: DocumentTypeFacet,
        daily: DocumentDailyFacet,
        monthly: DocumentMonthlyFacet,
        weekly: DocumentWeeklyFacet,
        quarterly: DocumentQuarterlyFacet,
      };
      const facetEntries: [string, any][] = [];
      for (const f of facets) {
        const FacetClass = facetMap[f];
        if (!FacetClass) continue;
        const rs = await FacetClass.search(facetQuery, FacetClass);
        facetEntries.push([f, rs]);
      }
      const facetsPayload = Object.fromEntries(
        facetEntries.map(([k, v]) => [k, {
          count: v.count,
          total_pages: v.total_pages,
          results: v.results?.map((x: any) => x?.attributes ?? x) ?? [],
        }])
      );

      payload = payload || {
        count: docResultSet.count,
        total_pages: docResultSet.total_pages,
        results: docResultSet.results.map((d: any) => d?.attributes ?? d),
        facets: facetsPayload,
        adapter_mode: "ts-aggregated",
      };

      // Debug echo: show upstream URLs we would call
      if (debug) {
        try {
          const docUrl = new URL(Client.BASE_URI + '/documents.json');
          const docParams = new URLSearchParams();
          Object.entries(docQuery).forEach(([k, v]) => buildParams(docParams, k, v as any));
          docUrl.search = docParams.toString();

          const facetUrls: Record<string, string> = {};
          for (const f of facets) {
            const fUrl = new URL(Client.BASE_URI + `/documents/facets/${f}`);
            const fParams = new URLSearchParams();
            Object.entries(facetQuery).forEach(([k, v]) => buildParams(fParams, k, v as any));
            fUrl.search = fParams.toString();
            facetUrls[f] = fUrl.toString();
          }
          const debugCond2 = hasConditions ? { ...nested.conditions } : undefined;
          if (debugCond2) {
            const toArr = (v: any) => Array.isArray(v) ? v : (v !== undefined && v !== null ? [v] : v);
            if (debugCond2.agencies !== undefined) debugCond2.agencies = toArr(debugCond2.agencies);
            if (debugCond2.sections !== undefined) debugCond2.sections = toArr(debugCond2.sections);
            if (debugCond2.type !== undefined) debugCond2.type = toArr(debugCond2.type);
            if (debugCond2.topics !== undefined) debugCond2.topics = toArr(debugCond2.topics);
          }
          (payload as any).__debug = {
            documents_url: docUrl.toString(),
            facet_urls: facetUrls,
            effective_query: {
              term: docQuery.term,
              conditions: debugCond2,
              per_page: docQuery.per_page,
              page: docQuery.page,
              order: docQuery.order,
              fields: docQuery.fields,
              facets,
            },
            received: {
              raw_url: event.rawUrl,
              raw_querystring: (()=>{ try { return new URL(event.rawUrl).search; } catch { return ''; } })(),
              nested,
              simple,
            },
          };
        } catch (e: any) {
          try { (payload as any).__debug = { error: String(e?.message || e) }; } catch {}
        }
      }
      }
    } else {
      let query: any = {
        term: queryTerm,
        conditions: hasConditions ? nested.conditions : undefined,
        per_page,
        page,
        order,
        ...(Array.isArray(fields) && fields.length ? { fields } : {}),
      };
      query = pruneUndefined(query);
      const resultSet = await Document.search(query);
      payload = {
        count: resultSet.count,
        total_pages: resultSet.total_pages,
        results: resultSet.results.map((d: any) => d?.attributes ?? d),
        adapter_mode: "ts-document",
      };

      if (debug) {
        const docUrl = new URL(Client.BASE_URI + '/documents.json');
        const docParams = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => buildParams(docParams, k, v as any));
        docUrl.search = docParams.toString();
        (payload as any).__debug = {
          documents_url: docUrl.toString(),
          effective_query: query,
          received: {
            raw_url: event.rawUrl,
            raw_querystring: (()=>{ try { return new URL(event.rawUrl).search; } catch { return ''; } })(),
            nested,
            simple,
          },
        };
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return {
      statusCode: status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.message || "Internal Error", details: err?.body || null }),
    };
  }
};
