import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Topic, Client } from "./fr-ts-microservices/src";

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    const baseUri = qs["base_uri"];
    const term = qs['term'] || qs['q'] || '';
    if (baseUri) Client.overrideBaseUri(baseUri);
    const res = await Topic.suggestions(term ? { term } : {});
    const arr = res.map((x: any) => x?.attributes ?? x);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topics: arr, adapter_mode: 'ts-topics-suggestions' }) };
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal Error', details: err?.body || null }) };
  }
};

