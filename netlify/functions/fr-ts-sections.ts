import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Section, Client } from "./fr-ts-microservices/src";

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
    if (baseUri) Client.overrideBaseUri(baseUri);

    const args = sanitizeQuery(qs);
    delete args['base_uri'];
    const res = await Section.search(args);
    const obj: Record<string, any> = {};
    for (const key in res) {
      const sec = (res as any)[key];
      obj[key] = (sec?.attributes ?? sec);
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: obj, adapter_mode: 'ts-sections-search' }) };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

