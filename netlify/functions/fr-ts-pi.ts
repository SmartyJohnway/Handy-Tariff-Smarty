import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { PublicInspectionDocument, Client } from "./fr-ts-microservices/src";

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
    const action = (qs["action"] || "search").toLowerCase(); // search | find | find_all | available_on | current
    if (baseUri) Client.overrideBaseUri(baseUri);

    if (action === 'current') {
      const resp = await PublicInspectionDocument.current();
      const payload = { count: resp.count, results: resp.results.map((d: any) => d?.attributes ?? d), adapter_mode: 'ts-pi-current' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    if (action === 'available_on') {
      const date = (qs['date'] || qs['available_on']);
      if (!date) return { statusCode: 400, body: JSON.stringify({ error: 'Missing date' }) };
      const resp = await PublicInspectionDocument.availableOn(date);
      const payload = { count: resp.count, results: resp.results.map((d: any) => d?.attributes ?? d), adapter_mode: 'ts-pi-available_on' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    if (action === 'find') {
      const id = qs['document_number'];
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing document_number' }) };
      const doc = await PublicInspectionDocument.find(id);
      const payload = { document: (doc as any)?.attributes ?? doc, adapter_mode: 'ts-pi-find' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    if (action === 'find_all') {
      const ids = (qs['document_numbers'] || '').split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) return { statusCode: 400, body: JSON.stringify({ error: 'Missing document_numbers' }) };
      const fields = (qs['fields'] || '').split(',').map(s => s.trim()).filter(Boolean);
      const resp = await PublicInspectionDocument.find_all(ids, fields.length ? { fields } : {});
      const payload = { count: resp.count, results: resp.results.map((d: any) => d?.attributes ?? d), adapter_mode: 'ts-pi-find_all' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    }

    // default: search
    const nested = parseBracketParams(qs);
    const args: any = sanitizeQuery(qs);
    delete args['base_uri']; delete args['action'];
    const query: any = { ...args };
    if (nested.conditions) query.conditions = nested.conditions;
    const resp = await PublicInspectionDocument.search(query);
    const payload = { count: resp.count, total_pages: resp.total_pages, results: resp.results.map((d: any) => d?.attributes ?? d), adapter_mode: 'ts-pi-search' };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

