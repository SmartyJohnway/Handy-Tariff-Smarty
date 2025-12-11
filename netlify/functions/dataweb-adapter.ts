// Cache-busting comment: 2025-10-07T05:30:00Z
import type { Handler, HandlerEvent, HandlerResponse, HandlerContext } from "@netlify/functions";
import { getFunctionsBaseUrl } from "./utils/netlify";
import { UnifiedTariff, ProgramRate, GlobalVars, SystemAlert, TradeStat } from "./models/unified";
import { normalizeInvestigations } from "./utils/investigation-parser";
import { handler as proxyHandler } from './dataweb-proxy';

// Define interfaces for Dataweb API response structure
interface DatawebChild {
  id: string;
  value?: string;
  children?: DatawebChild[];
}

interface DatawebSection {
  id: string;
  children?: DatawebChild[];
}

interface DatawebDetailsData {
  desc?: string;
  sections?: DatawebSection[];
  investigations?: any[]; // Using any to match the parser function signature
}

// Helper to parse trade statistics from the customs_value section
function parseTradeStats(sections: DatawebSection[] | undefined): TradeStat[] {
  if (!sections) return [];

  const stats: TradeStat[] = [];
  const tradeSections = sections.filter(s => s.id === 'customs_value' || s.id === 'imports' || s.id === 'exports');

  const regex = /(\d{4}).*?\(([^)]+)\)?.*?\$?([\d,]+)/i;

  for (const section of tradeSections) {
    for (const child of section.children || []) {
      if (child.value) {
        const match = child.value.replace(/<br\/>/g, ' ').match(regex);
        if (match) {
          const year = parseInt(match[1], 10);
          const metric = section.id; // Correctly use the section id as the metric
          const unitRaw = match[2].toLowerCase();
          const value = parseInt(match[3].replace(/,/g, ''), 10);
          
          const unit = unitRaw.includes('thousand dollar') ? 'usd' : unitRaw;
          const finalValue = unitRaw.includes('thousand dollar') ? value * 1000 : value;

          stats.push({
            year: year,
            metric: metric,
            value: finalValue,
            unit: unit,
          });
        }
      }
    }
  }
  return stats;
}

async function callDatawebApi(endpoint: string, event: HandlerEvent, method: string = "GET", body: any = null) {
  // console.log(`[Dataweb Adapter] Calling Dataweb API endpoint: ${endpoint} with method ${method} via direct invocation`);
  const baseUrl = process.env.DATAWEB_BASE_URL;
  if (!baseUrl) {
    throw new Error("DATAWEB_BASE_URL environment variable is not set.");
  }
  const token = process.env.DATAWEB_TOKEN;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) {
    headers['x-dw-auth'] = `Bearer ${token}`;
  }

  // Construct a mock HandlerEvent for the proxy function
  const functionsBase = getFunctionsBaseUrl(event);
  const proxyEvent: HandlerEvent = {
    rawUrl: `${functionsBase}/dataweb-proxy?base=${encodeURIComponent(baseUrl)}&endpoint=${encodeURIComponent(endpoint)}`,
    rawQuery: `base=${encodeURIComponent(baseUrl)}&endpoint=${encodeURIComponent(endpoint)}`,
    path: '/api/dataweb-proxy',
    httpMethod: method,
    headers: {
      ...event.headers,
      ...headers,
    },
    queryStringParameters: {
      base: baseUrl,
      endpoint: endpoint,
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
  };

  const context: HandlerContext = {
    functionName: 'dataweb-proxy',
    functionVersion: '1',
    invokedFunctionArn: '',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '',
    logStreamName: '',
    identity: undefined,
    clientContext: undefined,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
    callbackWaitsForEmptyEventLoop: false,
  };

  const response = await proxyHandler(proxyEvent, context);
  
  // console.log(`[Dataweb Adapter] Response for ${endpoint}: ok=${response.statusCode >= 200 && response.statusCode < 300}, status=${response.statusCode}`);

  if (!response || response.statusCode < 200 || response.statusCode >= 300) {
    if (response && response.statusCode === 404) {
      return null;
    }
    throw new Error(`DataWeb API call failed for ${endpoint}: ${response?.statusCode || 'N/A'}. Body: ${response?.body}`);
  }
  
  return JSON.parse(response.body || '{}');
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const searchTerm = event.queryStringParameters?.['searchTerm'];
  const hts8 = event.queryStringParameters?.['hts8'];
  const year = event.queryStringParameters?.['year'];
  const reportType = event.queryStringParameters?.['reportType'];
  const translation = event.queryStringParameters?.['translation'];

  // console.log(`[Dataweb Adapter] Handler invoked for hts8=${hts8}, year=${year}, reportType=${reportType}, searchTerm=${searchTerm}`);

  // Commodity translation (HTS -> NAICS/SITC)
  if (translation === 'commodity') {
    try {
      if (!event.body) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'adapter:processed' }, body: JSON.stringify({ error: 'Missing request body for commodity translation' }) };
      }
      const payload = JSON.parse(event.body);
      const commodityId: string | undefined = payload?.commodityId || payload?.hts8 || payload?.hts_code;
      const y: string | undefined = payload?.year || year;
      if (!commodityId || !y) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'adapter:processed' }, body: JSON.stringify({ error: 'Missing commodityId/hts8 and/or year' }) };
      }
      const cleanId = String(commodityId).replace(/\D/g, '').slice(0, 10);
      const body = { classificationFrom: 'HTS', commodityId: cleanId, year: String(y), tariffYear: String(y) } as any;
      const result = await callDatawebApi(`/api/v2/commodity/commodityTranslationLookup`, event, 'POST', body);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'adapter:processed' }, body: JSON.stringify(result) };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Dataweb Adapter] commodity translation error:', msg);
      return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'adapter:processed' }, body: JSON.stringify({ error: msg }) };
    }
  }

  if (reportType === 'runReport') {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'X-Adapter-Mode': 'adapter:processed' },
        body: JSON.stringify({ error: "Missing request body for runReport" }),
      };
    }
    try {
      const reportBody = JSON.parse(event.body);
      const reportData = await callDatawebApi(`/api/v2/report2/runReport`, event, "POST", reportBody);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify(reportData),
      };
    } catch (error: unknown) {
      let errorMessage = "Failed to parse report body or call DataWeb API for report";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`[Dataweb Adapter] Error processing runReport:`, error);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify({ error: errorMessage, data: [] }),
      };
    }
  }

  if (searchTerm && year) {
    try {
      const lookupBody = { searchTerm: searchTerm, tariffYear: year };
      const lookupData = await callDatawebApi(`/api/v2/tariff/currentTariffLookup`, event, "POST", lookupBody);
      const results = lookupData?.list || [];
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify(results),
      };
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred during search";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`[Dataweb Adapter] Error processing searchTerm ${searchTerm}:`, error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify({ error: errorMessage }),
      };
    }
  } else if (hts8 && year) {
    try {
      const [detailsData, globalVarsData, systemAlertsData] = await Promise.all([
        callDatawebApi(`/api/v2/tariff/currentTariffDetails?year=${year}&hts8=${hts8}`, event) as Promise<DatawebDetailsData | null>,
        callDatawebApi(`/api/v2/query/getGlobalVars`, event) as Promise<GlobalVars | null>,
        callDatawebApi(`/api/v2/system-alert`, event) as Promise<SystemAlert[] | null>,
      ]);

      if (!detailsData) {
          console.warn(`[Dataweb Adapter] No details data found for HTS8 ${hts8} in year ${year}`);
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify({ error: `No data found for HTS8 ${hts8} in year ${year}` })
      }
      }

      const tariffTreatment = detailsData.sections?.find((s: DatawebSection) => s.id === 'tariff_treatment');
      const baseRate = tariffTreatment?.children?.find((c: DatawebChild) => c.id === 'mfn')?.children?.find((c: DatawebChild) => c.id === 'mfn_text')?.value || undefined;
      const effectiveDate = tariffTreatment?.children?.find((c: DatawebChild) => c.id === 'bed')?.value || undefined;
      const endDate = tariffTreatment?.children?.find((c: DatawebChild) => c.id === 'eed')?.value || undefined;

      const programSection = detailsData.sections?.find((s: DatawebSection) => s.id === 'tariff_program');
      const programs: ProgramRate[] = programSection?.children?.reduce((acc: ProgramRate[], prog: DatawebChild) => {
        const statusNode = prog.children?.find((c: DatawebChild) => c.id === 'status');
        const status = statusNode?.value || prog.id;
        if (status) {
          const codeMatch = status.match(/code \"([^\"]+)\"/);
          const code = codeMatch ? codeMatch[1] : prog.id.toUpperCase();
          acc.push({
            code: code,
            rate_text: prog.children?.find((c: DatawebChild) => c.id === 'advr')?.value || status,
            status: status === 'Not Eligible' ? 'Not Eligible' : 'Eligible'
          });
        }
        return acc;
      }, []) || [];

      const investigations = normalizeInvestigations(detailsData.investigations);

      const tariff: UnifiedTariff = {
        source: "dataweb",
        year: year,
        hts8: hts8,
        description: detailsData.desc,
        base_rate: baseRate,
        programs: programs,
        investigations: investigations,
        tradeStats: parseTradeStats(detailsData.sections),
        globalVars: globalVarsData || undefined,
        systemAlerts: systemAlertsData || undefined,
        raw: detailsData,
        raw_globalVars: globalVarsData || undefined,
        raw_systemAlerts: systemAlertsData || undefined,
        trade_remedy: { ad: [], cvd: [] },
        fetched_at: new Date().toISOString(),
        effectiveDate: effectiveDate,
        endDate: endDate,
      };

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify(tariff),
      };

    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`[Dataweb Adapter] Error processing HTS8 ${hts8}:`, error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
        body: JSON.stringify({ error: errorMessage }),
      };
    }
  } else {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "X-Adapter-Mode": "adapter:processed" },
      body: JSON.stringify({ error: "Missing year and either searchTerm or hts8 parameter" }),
    };
  }
};
