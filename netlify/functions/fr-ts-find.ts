import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { Document, Client } from "./fr-ts-microservices/src";

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  try {
    const qs = event.queryStringParameters || {};
    const baseUri = qs["base_uri"];
    const documentNumber = qs["document_number"];
    const publication_date = qs["publication_date"]; // optional YYYY-MM-DD
    const fields = qs["fields"]; // optional comma-separated

    if (!documentNumber) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameter: document_number" }) };
    }

    if (baseUri) Client.overrideBaseUri(baseUri);

    const options: any = {};
    if (publication_date) options.publication_date = publication_date;
    if (fields) options.fields = String(fields).split(",").map(s => s.trim()).filter(Boolean);

    const doc = await Document.find(documentNumber, options);
    const payload = {
      document: (doc as any)?.attributes ?? doc,
      adapter_mode: "ts-find",
    };

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
