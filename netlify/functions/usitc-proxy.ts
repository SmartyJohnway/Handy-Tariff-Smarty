import type { Handler } from "@netlify/functions";

const USITC_API_URL = "https://datawebws.usitc.gov/dataweb/api/v2/report2/runReport";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.DATAWEB_API_TOKEN;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ error: "API token is not configured on the server." }),
    };
  }

  try {
    const response = await fetch(USITC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: event.body,
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return {
      statusCode: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
      body: text,
    };
  } catch (err: any) {
    console.error("USITC Proxy Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ error: "An unexpected error occurred in the proxy.", details: errorMessage }),
    };
  }
};