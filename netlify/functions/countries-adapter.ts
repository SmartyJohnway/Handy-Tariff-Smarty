import type { Handler, HandlerEvent } from "@netlify/functions";
import { getFunctionsBaseUrl } from "./utils/netlify";

async function callDatawebApi(endpoint: string, event: HandlerEvent) {
  const baseUrl = process.env.DATAWEB_BASE_URL || 'https://datawebws.usitc.gov/dataweb';
  const token = process.env.DATAWEB_TOKEN;
  const functionsBase = getFunctionsBaseUrl(event);

  const proxyUrl = new URL(`${functionsBase}/dataweb-proxy`);
  proxyUrl.searchParams.set('base', baseUrl);
  proxyUrl.searchParams.set('endpoint', endpoint);

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) {
    headers['x-dw-auth'] = `Bearer ${token}`;
  }

  const response = await fetch(proxyUrl.toString(), { headers });
  if (!response.ok) {
    throw new Error(`DataWeb API call failed for ${endpoint}: ${response.statusText}`);
  }
  return response.json();
}

export const handler: Handler = async (event) => {
  try {
    // Assuming Dataweb API returns an array of country objects like { code: "US", name: "United States" }
    const responseData = await callDatawebApi(`/api/v2/country/getAllCountries`, event);

    // Assuming Dataweb API returns an object with an 'options' array
    const countries = (responseData?.options || []).map((country: any) => ({
      code: country.iso2, // Use iso2 as the code
      name: country.name, // Use the existing name
    }));

    if (countries.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No countries data found or options array is empty" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(countries),
    };

  } catch (error: unknown) {
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`[Countries Adapter] Error fetching countries:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
