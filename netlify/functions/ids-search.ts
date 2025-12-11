import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import {
  USITCResponse,
  InvestigationItem,
  FlatInvestigation,
  normalizeInvestigation,
} from "../../src/types/usitc-schema";

const IDS_SOURCE_URL = "https://ids.usitc.gov/investigations.json";

// --- In-Memory Cache ---
// These variables live in the global scope of the function instance.
let cachedFlatData: FlatInvestigation[] | null = null;
let cachedRawData: InvestigationItem[] | null = null;
let cacheTimestamp: number | null = null;
// Cache Time-To-Live: 4 hours
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Fetches data from the source URL or retrieves it from the in-memory cache.
 * The raw data is normalized into a flat structure upon fetching.
 * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
 * @returns A promise that resolves to both flattened and raw data.
 */
async function getInvestigationsData(
  forceRefresh = false
): Promise<{ flat: FlatInvestigation[]; raw: InvestigationItem[] }> {
  const now = Date.now();
  const isCacheStale = !cacheTimestamp || now - cacheTimestamp > CACHE_TTL_MS;

  if (!forceRefresh && cachedFlatData && cachedRawData && !isCacheStale) {
    console.log("Serving from fresh cache.");
    return { flat: cachedFlatData, raw: cachedRawData };
  }

  console.log(
    forceRefresh ? "Forcing refresh." : `Cache stale or empty. Fetching new data.`
  );

  try {
    const response = await fetch(IDS_SOURCE_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from USITC: ${response.status} ${response.statusText}`
      );
    }
    const json: USITCResponse = (await response.json()) as USITCResponse;

    // Normalize the data immediately after fetching.
    // The cache will hold the clean, flat structure.
    cachedRawData = json.data;
    cachedFlatData = json.data.map(normalizeInvestigation);
    cacheTimestamp = now;

    console.log(`Successfully fetched and cached ${cachedFlatData.length} items.`);
    return { flat: cachedFlatData, raw: cachedRawData };
  } catch (error) {
    console.error("Error fetching or processing data:", error);
    // In case of a fetch error, if we have stale data, serve it as a fallback.
    if (cachedFlatData && cachedRawData) {
      console.warn("Serving stale data due to fetch error.");
      return { flat: cachedFlatData, raw: cachedRawData };
    }
    // If there's no cache at all, the error must be propagated.
    throw error;
  }
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    const params = event.queryStringParameters ?? {};

    // --- Parse Query Parameters ---
    const searchTerm = (params.q || "").toLowerCase().trim();
    const country = (params.country || "").toLowerCase().trim();
    const status = (params.status || "").toLowerCase().trim();
    const officialIdParam = (params.officialId || "").toLowerCase().trim();
    const orderNumberParam = (params.orderNumber || "").toLowerCase().trim();
    const page = parseInt(params.page || "1", 10);
    const pageSize = parseInt(params.pageSize || "10", 10);
    const forceRefresh = params.forceRefresh === "true" || params.forceRefresh === "1";
    const includeRaw = params.includeRaw === "true" || params.includeRaw === "1";

    // --- Get Data (from cache or fetch) ---
    const { flat: allData, raw } = await getInvestigationsData(forceRefresh);

    // --- Filtering Logic ---
    const filteredData = allData.filter((item) => {
      const matchesQ =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm) ||
        (item.topic ?? "").toLowerCase().includes(searchTerm) ||
        item.product.toLowerCase().includes(searchTerm) ||
        (item.officialId ?? "").toLowerCase().includes(searchTerm) ||
        (item.legacyId ?? "").toLowerCase().includes(searchTerm) ||
        (item.subNumbers ?? []).some((n) => n.toLowerCase().includes(searchTerm)) ||
        (item.commerceOrders ?? []).some((o) =>
          (o.orderNumber ?? "").toLowerCase().includes(searchTerm)
        ) ||
        item.countries.some((c) => c.toLowerCase().includes(searchTerm));

      const matchesCountry =
        !country || item.countries.some((c) => c.toLowerCase().includes(country));

      const matchesStatus =
        !status || (item.status ?? "").toLowerCase().includes(status);

      const matchesOfficial =
        !officialIdParam ||
        (item.officialId ?? "").toLowerCase().includes(officialIdParam) ||
        (item.legacyId ?? "").toLowerCase().includes(officialIdParam) ||
        (item.subNumbers ?? []).some((n) => n.toLowerCase().includes(officialIdParam));

      const matchesOrderNumber =
        !orderNumberParam ||
        (item.commerceOrders ?? []).some((o) =>
          (o.orderNumber ?? "").toLowerCase().includes(orderNumberParam)
        );

      return matchesQ && matchesCountry && matchesStatus && matchesOfficial && matchesOrderNumber;
    });

    // --- Sorting (by officialId then id as tiebreaker) ---
    const sortedData = filteredData.sort((a, b) => {
      const aKey = (a.officialId ?? "").toLowerCase();
      const bKey = (b.officialId ?? "").toLowerCase();
      if (aKey && bKey) {
        const cmp = aKey.localeCompare(bKey, undefined, { numeric: true });
        if (cmp !== 0) return cmp;
      } else if (aKey || bKey) {
        return aKey ? -1 : 1;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });

    // --- Pagination Logic ---
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = sortedData.slice(startIndex, endIndex);

    // --- Optional Raw Data (matched to paginated items) ---
    let rawData: InvestigationItem[] | undefined;
    if (includeRaw && raw) {
      const rawIndex = new Map<string | number, InvestigationItem>();
      raw.forEach((r) => {
        const id =
          (r as any).investigation_id ??
          (r as any)["Investigation ID"] ??
          (r as any).case_id ??
          (r as any)["Case ID"];
        if (id !== undefined) rawIndex.set(id, r);
      });
      rawData = paginatedData
        .map((item) => rawIndex.get(item.id))
        .filter(Boolean) as InvestigationItem[];
    }

    // --- Response ---
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Or specify your frontend domain for better security
      },
      body: JSON.stringify({
        metadata: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize,
          sourceDataTimestamp: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null,
        },
        data: paginatedData,
        rawData: includeRaw ? rawData : undefined,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "An error occurred while processing your request.",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
