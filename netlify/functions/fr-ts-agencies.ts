import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Agency, Client } from "./fr-ts-microservices/src";

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
    const action = (qs["action"] || "all").toLowerCase(); // all | find | suggestions
    if (baseUri) Client.overrideBaseUri(baseUri);

    const args = sanitizeQuery(qs);
    delete args["base_uri"]; delete args["action"]; delete args["id"]; delete args["slug"]; delete args["fields"]; delete args["q"]; delete args["term"]; // handled specifically

    let payload: any;
    if (action === "find") {
      const idOrSlug = (qs["id"] || qs["slug"]);
      if (!idOrSlug) return { statusCode: 400, body: JSON.stringify({ error: "Missing id/slug" }) };
      const fields = (qs["fields"] || "").split(",").map(s => s.trim()).filter(Boolean);
      const resp = await Agency.find(idOrSlug!, fields.length ? { fields } : {});
      payload = Array.isArray(resp) ? resp.map((a: any) => a?.attributes ?? a) : (resp as any)?.attributes ?? resp;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agency: payload, adapter_mode: "ts-agencies-find" }) };
    } else if (action === "suggestions") {
      const q = (qs["q"] || qs["term"] || "").trim();
      const resp = await Agency.suggestions(q ? { term: q } : {});
      payload = resp.map((a: any) => a?.attributes ?? a);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agencies: payload, adapter_mode: "ts-agencies-suggestions" }) };
    } else {
      const fields = (qs["fields"] || "").split(",").map(s => s.trim()).filter(Boolean);
      const resp = await Agency.all(fields.length ? { fields } : {});
      payload = resp.map((a: any) => a?.attributes ?? a);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agencies: payload, adapter_mode: "ts-agencies-all" }) };
    }
  } catch (err: any) {
    const status = Number(err?.statusCode) || 500;
    return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: err?.message || "Internal Error", details: err?.body || null }) };
  }
};
