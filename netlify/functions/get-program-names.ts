import type { Handler, HandlerEvent } from "@netlify/functions";
import { getFunctionsBaseUrl } from "./utils/netlify";

export const handler: Handler = async (event: HandlerEvent) => {
  const functionsBase = getFunctionsBaseUrl(event);
  const endpoint = '/api/v2/tariff/tariffProgramsLookup';
  const base = process.env.DATAWEB_BASE_URL;
  if (!base) {
    return { statusCode: 500, body: JSON.stringify({ error: "DATAWEB_BASE_URL environment variable is not set." }) };
  }

  // We call our own proxy to handle CORS and potential auth.
  const proxyUrl = new URL(`${functionsBase}/dataweb-proxy`);
  proxyUrl.searchParams.set('base', base);
  proxyUrl.searchParams.set('endpoint', endpoint);

  const headers: Record<string, string> = {};
  if (process.env.DATAWEB_TOKEN) {
    headers['x-dw-auth'] = `Bearer ${process.env.DATAWEB_TOKEN}`;
  }

  try {
    const response = await fetch(proxyUrl.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dataweb proxy failed for ${endpoint}:`, errorText);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Failed to fetch program names from DataWeb.`, details: errorText }),
      };
    }

    const data = await response.json();

    // The proxy already sets cache-control, so we just pass the data through.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };

  } catch (err: any) {
    console.error(`Error calling proxy for program names:`, err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to load program names.", details: err.message }),
    };
  }
};
