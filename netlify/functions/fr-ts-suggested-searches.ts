import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { SuggestedSearch, Client } from "./fr-ts-microservices/src";

function sanitizeQuery(qs: Record<string, string | undefined>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(qs || {})) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    const baseUri = qs["base_uri"];
    const action = (qs["action"] || "search").toLowerCase(); // search | find
    if (baseUri) Client.overrideBaseUri(baseUri);

    if (action === 'find') {
      const slug = qs['slug'];
      if (!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }) };
      const ss = await SuggestedSearch.find(slug);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggested_search: (ss as any)?.attributes ?? ss, adapter_mode: 'ts-suggested-find' }) };
    }

    // default: search
    const args = sanitizeQuery(qs);
    delete args['base_uri']; delete args['action']; delete args['slug'];
    const res = await SuggestedSearch.search(args);
    const obj: Record<string, any[]> = {};
    for (const section in res) {
      obj[section] = res[section].map((x: any) => x?.attributes ?? x);
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: obj, adapter_mode: 'ts-suggested-search' }) };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

