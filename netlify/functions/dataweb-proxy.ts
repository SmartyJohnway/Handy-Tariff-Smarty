import type { Handler } from "@netlify/functions";
import { fetch, RequestInit } from "undici";

// Generic proxy to USITC DataWeb to avoid browser CORS
// Usage (dev): /api/dataweb-proxy?endpoint=/api/v2/system-alert&base=<DATAWEB_URL>
// Auth: send header 'x-dw-auth: Bearer <token>' or 'x-dw-key: <token>' from the client.

const MAX_REDIRECTS = 10;

async function fetchWithCookieRedirects(upstream: string, init: RequestInit, baseHeaders: Record<string, string>) {
  const baseBody = init.body;
  const baseMethod = (init.method || "GET").toUpperCase();
  let currentUrl = upstream;
  let currentMethod = baseMethod;
  let currentBody = baseBody;
  let redirectCount = 0;
  const cookieJar: Record<string, string> = {};

  while (true) {
    const requestHeaders: Record<string, string> = { ...baseHeaders };
    const storedCookies = Object.entries(cookieJar)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    if (storedCookies) {
      requestHeaders["cookie"] = storedCookies;
    }
    if (cookieJar["XSRF-TOKEN"]) {
      requestHeaders["x-xsrf-token"] = cookieJar["XSRF-TOKEN"];
    }

    const currentInit: RequestInit = {
      ...init,
      method: currentMethod,
      headers: requestHeaders,
      body: currentBody,
      redirect: "manual",
    };

    // console.log(`[dataweb-proxy] Fetch attempt ${redirectCount + 1} for ${currentUrl} with method ${currentMethod}`);
    const response = await fetch(currentUrl, currentInit);

    const rawHeaders = typeof (response.headers as any)?.raw === "function" ? (response.headers as any).raw() : {};
    const setCookieValues = rawHeaders?.["set-cookie"] || [];
    const cookiesToProcess = Array.isArray(setCookieValues) ? setCookieValues : [setCookieValues].filter(Boolean);
    for (const cookieValue of cookiesToProcess) {
      const pair = cookieValue.split(";")[0];
      const eqIndex = pair.indexOf("=");
      if (eqIndex > 0) {
        const name = pair.slice(0, eqIndex).trim();
        const value = pair.slice(eqIndex + 1).trim();
        if (name) {
          cookieJar[name] = value;
        }
      }
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) {
      return response;
    }

    redirectCount += 1;
    if (redirectCount > MAX_REDIRECTS) {
      throw new Error("redirect count exceeded");
    }

    const nextUrl = new URL(location, currentUrl).toString();
    // console.log(`[dataweb-proxy] Redirecting to ${nextUrl} (status ${response.status})`);
    currentUrl = nextUrl;

    if (response.status === 303) {
      currentMethod = "GET";
      currentBody = undefined;
    } else {
      currentMethod = currentMethod;
      currentBody = baseBody;
    }
  }
}

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const base = url.searchParams.get("base") || process.env.DATAWEB_BASE_URL;
    const endpoint = url.searchParams.get("endpoint") || url.searchParams.get("path") || "";

    // console.log(`[dataweb-proxy] Base URL: ${base}, Endpoint: ${endpoint}`);

    if (!base) {
      const errorHeaders: Record<string, string> = { "content-type": "application/json", "X-Adapter-Mode": "dataweb:proxy" };
      return { statusCode: 400, headers: errorHeaders, body: JSON.stringify({ error: "Missing 'base' parameter or DATAWEB_BASE_URL environment variable" }) };
    }

    if (!endpoint || !/^\//.test(endpoint)) {
      const errorHeaders: Record<string, string> = { "content-type": "application/json", "X-Adapter-Mode": "dataweb:proxy" };
      return { statusCode: 400, headers: errorHeaders, body: JSON.stringify({ error: "Missing or invalid 'endpoint' (must start with /)" }) };
    }
    if (!endpoint.startsWith("/api/")) {
      const errorHeaders: Record<string, string> = { "content-type": "application/json", "X-Adapter-Mode": "dataweb:proxy" };
      return { statusCode: 400, headers: errorHeaders, body: JSON.stringify({ error: "Refusing to proxy non-API path" }) };
    }

    const method = (event.httpMethod || "GET").toUpperCase();

    const upstream = base.replace(/\/$/, "") + endpoint;
    const headers: Record<string, string> = { "content-type": "application/json" };

    // Accept either a Bearer token or X-Api-Key from client headers
    const dwAuth = event.headers["x-dw-auth"] || event.headers["X-Dw-Auth"] as any;
    const dwKey = event.headers["x-dw-key"] || event.headers["X-Dw-Key"] as any;
    if (dwAuth) headers["Authorization"] = String(dwAuth);
    if (dwKey) headers["X-Api-Key"] = String(dwKey);

    const init: RequestInit = { method, headers, redirect: 'manual' };
    if (method !== "GET" && method !== "HEAD") {
      init.body = event.body || undefined;
    }

    // console.log(`[dataweb-proxy] Attempting to fetch upstream URL: ${upstream} with init:`, init);
    const resp = await fetchWithCookieRedirects(upstream, init, headers);
    const responseHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    // console.log(`[dataweb-proxy] Initial response status: ${resp.status}, headers:`, responseHeaders); // Log initial response status and headers
    const text = await resp.text();
    const contentType = resp.headers.get("content-type") || "application/json";

    const cacheControl = method === 'GET'
      ? 's-maxage=14400, stale-while-revalidate'
      : 'no-store';

    return {
      statusCode: resp.status,
      headers: { 'content-type': contentType, 'cache-control': cacheControl, 'X-Adapter-Mode': 'dataweb:proxy' },
      body: text,
    };
  } catch (err: any) {
    console.error("[dataweb-proxy] fetch error:", err);
    const errorHeaders: Record<string, string> = { "content-type": "application/json", "X-Adapter-Mode": "dataweb:proxy" };
    return {
      statusCode: 500,
      headers: errorHeaders,
      body: JSON.stringify({
        error: "proxy_error",
        detail: err?.message || String(err),
        cause: err?.cause ?? null,
      }),
    };
  }
};
