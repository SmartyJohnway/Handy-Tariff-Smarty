import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import {
  Client,
  PublicInspectionDocumentAgenciesFacet,
  PublicInspectionDocumentAgencyFacet,
  PublicInspectionDocumentTypeFacet,
  PublicInspectionIssueDailyFacet,
  PublicInspectionIssueTypeFacet,
} from "./fr-ts-microservices/src";

function parseBracketParams(qs: Record<string, any>): Record<string, any> {
  const nested: Record<string, any> = {};
  const setDeep = (obj: any, path: string[], value: any) => {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in cur) || typeof cur[key] !== 'object' || cur[key] === null) cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = value;
  };
  for (const [rawKey, value] of Object.entries(qs)) {
    const match = rawKey.match(/^[^\[]+(\[[^\]]+\])+$/);
    if (match) {
      const parts = rawKey.split(/\[|\]/).filter(Boolean);
      const root = parts.shift()!;
      setDeep(nested, [root, ...parts], value);
    }
  }
  return nested;
}

// 支援：
//  - Document facets: agencies, agency, type（走 vendors）
//  - Issue facets: issue_daily, issue_type（直連上游 + 參數容錯）
export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    const baseUri = qs["base_uri"];
    const facetRaw = (qs["facet"] ?? "").toString();
    const facet = facetRaw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!facet) return { statusCode: 400, body: JSON.stringify({ error: "Missing facet" }) };
    if (baseUri) Client.overrideBaseUri(baseUri);

    const nested = parseBracketParams(qs);
    const page = qs["page"] ? Number(qs["page"]) : undefined;
    const perPage = qs["per_page"] ? Number(qs["per_page"]) : undefined;

    const args: any = {};
    if (nested.conditions) args.conditions = nested.conditions;
    if (typeof page === 'number') args.page = page;
    if (typeof perPage === 'number') args.per_page = perPage;

    if (facet === 'agencies' || facet === 'agency' || facet === 'type') {
      try {
        const CLASS_MAP: Record<string, any> = {
          agencies: PublicInspectionDocumentAgenciesFacet,
          agency: PublicInspectionDocumentAgencyFacet,
          type: PublicInspectionDocumentTypeFacet,
        };
        const FacetClass = CLASS_MAP[facet];
        const res = await FacetClass.search(args, FacetClass);
        const rawResults = (res as any)?.results;
        const safeResults = Array.isArray(rawResults) ? rawResults.map((x: any) => (x && typeof x === 'object' ? (x.attributes ?? x) : x)) : [];
        const payload = {
          count: Number((res as any)?.count) || safeResults.length,
          total_pages: Number((res as any)?.total_pages) || 1,
          results: safeResults,
          adapter_mode: `ts-pi-facet-${facet}`,
        };
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      } catch (err: any) {
        const payload = { count: 0, total_pages: 1, results: [], adapter_mode: `ts-pi-facet-${facet}` , error: err?.message || 'Facet fetch failed', details: err?.body || null };
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      }
    }

    if (facet === 'issue_daily' || facet === 'issue_type') {
      const ao = (qs as any)["on"] || (qs as any)["date"] || (qs as any)["available_on"] || (args as any)?.conditions?.available_on || (args as any)?.conditions?.on;
      if (!ao) {
        const payload = { results: [], adapter_mode: `ts-pi-facet-${facet}`, error: 'Missing required date parameter (on/date/available_on) for issue facets' };
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      }

      const mmddyyyy = (() => { const m = String(ao).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[2]}/${m[3]}/${m[1]}` : null; })();
      // Upstream expects nested conditions (conditions[on]/conditions[date]/conditions[available_on]).
      const tryParams: any[] = [];
      // Preferred nested params (OK with FR API)
      if (mmddyyyy) tryParams.push({ conditions: { on: mmddyyyy } });
      tryParams.push(
        { conditions: { on: ao } },
        { conditions: { date: ao } },
        { conditions: { available_on: ao } },
      );
      // Fallback to top-level keys, in case of proxy behaviors
      if (mmddyyyy) tryParams.push({ on: mmddyyyy });
      tryParams.push({ on: ao }, { date: ao }, { available_on: ao });
      if (baseUri) tryParams.forEach(p => (p.base_uri = baseUri));

      let merged: any = null;
      for (const qp of tryParams) {
        try {
          const res = await Client.get(
            facet === 'issue_daily' ? '/public-inspection-issues/facets/daily' : '/public-inspection-issues/facets/type',
            qp
          );
          if (res && typeof res === 'object' && !Array.isArray(res)) {
            const keys = Object.keys(res);
            if (keys.length && !(keys.length <= 2 && ("errors" in res || "status" in res))) { merged = res; break; }
          }
        } catch {}
      }
      if (!merged) {
        const payload = { results: [], adapter_mode: `ts-pi-facet-${facet}`, error: 'Upstream issue facets unavailable', details: null };
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      }

      const mapped = Object.entries(merged).map(([slug, attributes]: [string, any]) => ({
        slug,
        name: String((attributes as any)?.name || slug),
        special_filings: (attributes as any)?.special_filings || null,
        regular_filings: (attributes as any)?.regular_filings || null,
      }));
      const payload = { results: mapped, adapter_mode: `ts-pi-facet-${facet}` };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Unsupported facet" }) };
  } catch (err: any) {
    // 後端異常時，盡量回覆 200 並附上錯誤，避免前端中斷
    const payload = { results: [], adapter_mode: 'ts-pi-facet-error', error: err?.message || 'Internal Error', details: err?.body || null };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  }
};
