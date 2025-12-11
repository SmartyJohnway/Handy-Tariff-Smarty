import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { normalizeInvestigations } from "./utils/investigation-parser";
import { getFunctionsBaseUrl } from "./utils/netlify";

async function callDatawebApi(endpoint: string, event: HandlerEvent) {
  const functionsBase = getFunctionsBaseUrl(event);
  const baseUrl = process.env.DATAWEB_BASE_URL;
  if (!baseUrl) {
    throw new Error("DATAWEB_BASE_URL environment variable is not set.");
  }
  const token = process.env.DATAWEB_TOKEN;

  const proxyUrl = new URL(`${functionsBase}/dataweb-proxy`);
  proxyUrl.searchParams.set('base', baseUrl);
  proxyUrl.searchParams.set('endpoint', endpoint);

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) {
    headers['x-dw-auth'] = `Bearer ${token}`;
  }

  const response = await fetch(proxyUrl.toString(), { headers });

  if (!response.ok) {
    if (response.status === 404) return null;
    const errorBody = await response.text();
    throw new Error(`DataWeb API call failed for ${endpoint}: ${response.status} ${response.statusText}. Body: ${errorBody}`);
  }
  return response.json();
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const { hts8, year } = event.queryStringParameters || {};

  if (!hts8 || !year) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing hts8 or year parameter" }) };
  }

  try {
    const detailsData = await callDatawebApi(`/api/v2/tariff/currentTariffDetails?year=${year}&hts8=${hts8}`, event);
    
    if (!detailsData || !detailsData.investigations) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([]) };
    }

    const normalized = normalizeInvestigations(detailsData.investigations || []);
    
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', "cache-control": "s-maxage=14400, stale-while-revalidate" },
      body: JSON.stringify(normalized),
    };
    return response;

  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};
