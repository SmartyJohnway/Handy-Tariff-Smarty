import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Client, PresidentialDocumentTypeFacet } from "./fr-ts-microservices/src";

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

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    const baseUri = qs["base_uri"];
    if (baseUri) Client.overrideBaseUri(baseUri);

    const nested = parseBracketParams(qs);
    const page = qs["page"] ? Number(qs["page"]) : undefined;
    const perPage = qs["per_page"] ? Number(qs["per_page"]) : undefined;

    const args: any = {};
    if (nested.conditions) args.conditions = nested.conditions;
    if (typeof page === 'number') args.page = page;
    if (typeof perPage === 'number') args.per_page = perPage;

    const res = await PresidentialDocumentTypeFacet.search(args, PresidentialDocumentTypeFacet);
    const payload = {
      count: (res as any).count,
      total_pages: (res as any).total_pages,
      results: ((res as any).results || []).map((x: any) => x?.attributes ?? x),
      adapter_mode: `ts-presidential-facet-subtype`,
    };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

