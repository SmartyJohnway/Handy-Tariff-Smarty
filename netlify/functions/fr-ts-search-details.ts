import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Client } from "./fr-ts-microservices/src";

function sanitizeQuery(qs: Record<string, string | undefined>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(qs || {})) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

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
    const kind = (qs["kind"] || "document").toLowerCase(); // document | public_inspection
    if (baseUri) Client.overrideBaseUri(baseUri);

    const nested = parseBracketParams(qs);
    const args = sanitizeQuery(qs);
    delete args['base_uri']; delete args['kind'];
    if (nested.conditions) args.conditions = nested.conditions;

    if (kind === 'public_inspection') {
      const details = await Client.getPublicInspectionDocumentSearchDetails(args);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ details: (details as any)?.attributes ?? details, adapter_mode: 'ts-search-details-pi' }) };
    } else {
      const details = await Client.getDocumentSearchDetails(args);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ details: (details as any)?.attributes ?? details, adapter_mode: 'ts-search-details-doc' }) };
    }
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

