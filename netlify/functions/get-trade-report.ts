import type { Handler, HandlerEvent, HandlerResponse, HandlerContext } from "@netlify/functions";
import * as fs from 'fs';
import * as path from 'path';
import { cleanHtsToSix } from "@/utils/countries";
import { getFunctionsBaseUrl } from "./utils/netlify";
import { handler as adapterHandler } from './dataweb-adapter';

function tryLoadBundledCountries(): any[] {
  const candidates = [
    path.resolve(process.cwd(), 'TariffHTSUSearcher', 'public', 'assets', 'data', 'countries.json'),
    path.resolve(process.cwd(), 'public', 'assets', 'data', 'countries.json'),
    path.resolve(__dirname, '../../public/assets/data/countries.json'),
    path.resolve(__dirname, '../../../public/assets/data/countries.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        const opts = Array.isArray(json?.options) ? json.options : (Array.isArray(json) ? json : []);
        if (Array.isArray(opts) && opts.length) return opts;
      }
    } catch {}
  }
  return [];
}

// This is a template for the runReport API call, configured to the one known-good state.
const getReportBodyTemplate = (
  htsCodes: string[],
  years: string[],
  countryCodes: string[] | null,
  indicator: 'quantity' | 'value',
  breakout: boolean
) => ({
  savedQueryName: "",
  savedQueryDesc: "",
  isOwner: true,
  runMonthly: false,
  reportOptions: {
    tradeType: "Import",
    classificationSystem: "HTS"
  },
  searchOptions: {
    MiscGroup: {
      districts: { districtsSelectType: "all" },
      importPrograms: { programsSelectType: "all" },
      extImportPrograms: { programsSelectType: "all" },
      provisionCodes: { provisionCodesSelectType: "all" }
    },
    commodities: {
      aggregation: "Aggregate Commodities",
      codeDisplayFormat: "YES",
      commodities: htsCodes.map(c => c.replace(/\./g, '').substring(0, 10)),
      commoditiesExpanded: [],
      commoditiesManual: "",
      commodityGroups: { systemGroups: [], userGroups: [] },
      commoditySelectType: "list",
      granularity: "10",
      groupGranularity: null,
      searchGranularity: null
    },
    componentSettings: {
      dataToReport: indicator === 'value' ? ["CONS_CUSTOMS_VALUE"] : ["CONS_FIR_UNIT_QUANT"],
      scale: "1",
      timeframeSelectType: "fullYears",
      years: years,
      startDate: null,
      endDate: null,
      startMonth: null,
      endMonth: null,
      yearsTimeline: "Annual"
    },
    countries: breakout
      ? (
          (countryCodes && countryCodes.length > 0)
            // Break Out within selected countries
            ? {
                aggregation: "Break Out Countries",
                countries: countryCodes,
                countriesExpanded: [], // will be filled below to avoid validation errors
                countriesSelectType: "list",
                countryGroups: { systemGroups: [], userGroups: [] }
              }
            // Break Out across all countries
            : {
                aggregation: "Break Out Countries",
                countries: [],
                countriesExpanded: [ { name: "All Countries", value: "all" } ],
                countriesSelectType: "all",
                countryGroups: { systemGroups: [], userGroups: [] }
              }
        )
      : (countryCodes && countryCodes.length > 0
          ? {
              aggregation: "Aggregate Countries",
              countries: countryCodes,
              countriesExpanded: [],
              countriesSelectType: "list",
              countryGroups: { systemGroups: [], userGroups: [] }
            }
          : {
              aggregation: "Aggregate Countries",
              countries: [],
              countriesExpanded: [ { name: "All Countries", value: "all" } ],
              countriesSelectType: "all",
              countryGroups: { systemGroups: [], userGroups: [] }
            })
  },
  sortingAndDataFormat: {
    DataSort: { columnOrder: [], fullColumnOrder: [], sortOrder: [] },
    reportCustomizations: { exportCombineTables: false, showAllSubtotal: true, totalRecords: "20000", exportRawData: indicator === 'value' }
  }
});

// Resolve DataWeb dataToReport by flow/metric (includes extended metrics)
function resolveDataToReport(flow: 'cons'|'gen', metric: 'quantity'|'value'|'cif'|'charges'|'dutiable'|'calc_duties'|'landed'): string {
  // Primary mappings known-good
  const map: Record<string, string> = {
    'cons:quantity': 'CONS_FIR_UNIT_QUANT',
    'cons:value': 'CONS_CUSTOMS_VALUE',
    'cons:cif': 'CONS_COST_INS_FREIGHT',
    'cons:charges': 'CONS_CHARGES_INS_FREIGHT',
    'cons:dutiable': 'CONS_CUSTOMS_VALUE_SUB_DUTY',
    'cons:calc_duties': 'CONS_CALC_DUTY',
    // Landed: 使用特別流程（三份請求後端合成）。此映射僅作後備不常用。
    'cons:landed': 'CONS_COST_INS_FREIGHT+CONS_CALC_DUTY',
    'gen:quantity': 'GEN_FIR_UNIT_QUANTITY',
    'gen:value': 'GEN_CUSTOMS_VALUE',
    'gen:cif': 'GEN_COST_INS_FREIGHT',
    'gen:charges': 'GEN_CHARGES_INS_FREIGHT',
    'gen:dutiable': 'GEN_DUTIABLE_VALUE',
    'gen:calc_duties': 'GEN_CALC_DUTY',
  };
  const key = `${flow}:${metric}`;
  return map[key] || map['cons:quantity'];
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  const origin = new URL(event.rawUrl).origin;
  // Structured Request ID for correlation across logs and client diagnostics
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const { hts_code, history_years = '5', countries, indicator = 'quantity', breakout, flow = 'cons', metric, metrics, commodity_select, granularity, ytd, commodities, compare, commodities_breakout } = event.queryStringParameters || {};
  const compareEnabled = String(compare || '').toLowerCase() === 'true' || String(compare || '') === '1';
  const flowResolved: 'cons'|'gen'|'balance' = (flow === 'gen') ? 'gen' : ((flow === 'balance') ? 'balance' : 'cons');
  
  // Allow fallback from hts_code (single) to commodities (multiple)
  const isCountryBreakout = String(breakout || '').toLowerCase() === 'true' || compareEnabled; // This refers to country breakout
  let htsList = (commodities || hts_code || '').split(',').map(s => s.trim()).filter(Boolean);
  const requestedGranularity = granularity || '10'; // Default to 10 if not specified
  const isCommodityBreakout = String(commodities_breakout || '').toLowerCase() === 'true' || String(commodities_breakout || '') === '1';

  let finalGranularity: string;
  let finalAggregation: string;
  let processedHtsList: string[];

  // Determine finalGranularity and finalAggregation based on user's table
  // Condition: Single HTS display separately OR explicit commodity breakout flag
  if ((htsList.length === 1 && requestedGranularity === '10' && !isCountryBreakout && flowResolved !== 'balance') || isCommodityBreakout) {
    finalAggregation = isCommodityBreakout ? 'Break Out Commodities' : 'Display Commodities Separately';
    finalGranularity = isCommodityBreakout ? (requestedGranularity || '8') : '10';
    processedHtsList = htsList.map(h => h.replace(/\./g, '').substring(0, 10)); // Keep full 10-digit
  } else {
    // All other conditions (multiple HTS, country breakout/compare, or balance flow)
    finalAggregation = 'Aggregate Commodities'; // Default for these cases
    finalGranularity = '6'; // Default granularity for these cases

    // For these cases, HTS codes should be 6-digit
    processedHtsList = htsList.map(c => c.replace(/\./g, '').substring(0, 6));
  }

  // Ensure processedHtsList is not empty if original htsList was not empty
  if (htsList.length > 0 && processedHtsList.length === 0) {
      // This should ideally not happen if htsList was not empty, but as a safeguard.
      processedHtsList = htsList.map(c => c.replace(/\./g, '').substring(0, 6));
  }
  if (processedHtsList.length === 0) {
    // If after all processing, htsList is empty, it's an error.
    // This check was originally at the top, moved here after HTS list processing.
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameter: hts_code or commodities" }) };
  }

  if (htsList.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameter: hts_code or commodities" }) };
  }

  try {
    // console.log('[get-trade-report] start', { requestId, hts_code, commodities, flow, metric, metrics, breakout, countries, history_years, ytd });
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: parseInt(history_years, 10) }, (_, i) => String(currentYear - i)).reverse();

    const countryCodes = (countries || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    // Backward compatibility: if metric is provided, use it; otherwise map from indicator
    const metricResolved = (metric === 'value' || metric === 'quantity' || metric === 'cif' || metric === 'charges' || metric === 'dutiable' || metric === 'calc_duties' || metric === 'landed')
      ? (metric as 'quantity'|'value'|'cif'|'charges'|'dutiable'|'calc_duties'|'landed')
      : (indicator === 'value' ? 'value' : 'quantity');

    const reportBody = getReportBodyTemplate(
      processedHtsList, // Use the newly processed HTS list
      years,
      countryCodes.length ? countryCodes : null,
      // For legacy template, keep 'indicator' as quantity/value; actual DataWeb field set below
      (metricResolved === 'value' ? 'value' : 'quantity'),
      breakout === 'true'
    );

    const commoditiesOptions = (reportBody as any)?.searchOptions?.commodities;
    if (commoditiesOptions) {
        // Apply the determined aggregation and granularity
        commoditiesOptions.aggregation = finalAggregation;
        commoditiesOptions.granularity = finalGranularity;
        commoditiesOptions.commodities = processedHtsList; // Ensure this is the final list
        commoditiesOptions.commoditiesManual = processedHtsList.join(','); // For manual input
        commoditiesOptions.commoditySelectType = 'list'; // Always list for explicit HTS codes

        // DataWeb requires expanded list for 'Display Commodities Separately'
        if (finalAggregation === 'Display Commodities Separately') {
            commoditiesOptions.commoditiesExpanded = processedHtsList.map(code => ({
                name: code, // Placeholder, DataWeb will fill description
                value: code,
            }));
            // For Display Commodities Separately, we must specify the commodity column in the sort order.
            const dataSort = (reportBody as any)?.sortingAndDataFormat?.DataSort;
            if (dataSort) {
                const commodityCol = finalGranularity === '10' ? "HTS10 & DESCRIPTION" : "HTS6 & DESCRIPTION";
                if (!dataSort.columnOrder.includes(commodityCol)) {
                    dataSort.columnOrder = [commodityCol, ...dataSort.columnOrder];
                }
                if (!(dataSort.fullColumnOrder || []).some((c: any) => String(c?.value||c?.name||'').toUpperCase()===commodityCol.toUpperCase())) {
                    dataSort.fullColumnOrder = [{ name: commodityCol, value: commodityCol }, ...dataSort.fullColumnOrder];
                }
            }
        } else {
            commoditiesOptions.commoditiesExpanded = [];
        }
    }

    // Override tradeType + dataToReport with flow/metric mapping
    try {
      (reportBody as any).reportOptions.tradeType = (flowResolved === 'gen') ? 'GenImp' : (flowResolved === 'balance' ? 'Balance' : 'Import');
      // Support multiple metrics via metrics=quantity,value,cif,charges,dutiable,calc_duties,landed
      const metricList: ('quantity'|'value'|'cif'|'charges'|'dutiable'|'calc_duties'|'landed')[] = [];
      if (typeof metrics === 'string' && metrics.trim()) {
        for (const m of metrics.split(',').map(s => s.trim().toLowerCase())) {
          if (m === 'quantity' || m === 'value' || m === 'cif' || m === 'charges' || m === 'dutiable' || m === 'calc_duties' || m === 'landed') metricList.push(m as any);
        }
      }
      if (!metricList.length) metricList.push(metricResolved);
      // Map metrics to DataWeb dataToReport codes (landed → composite expression when flow=cons)
      const codes = flowResolved === 'balance'
        ? [] // 'balance' flow has a special hardcoded dataToReport field
        : Array.from(new Set(metricList.map(m => resolveDataToReport(flowResolved as 'cons' | 'gen', m))));
      (reportBody as any).searchOptions.componentSettings.dataToReport = codes;
      if (flowResolved === 'balance') {
        // 覆寫為官方 Trade Balance 欄位
        (reportBody as any).searchOptions.componentSettings.dataToReport = ['FAS_VALUE-GEN_CUSTOMS_VALUE'];
      }
      // 始終回傳表格式資料，避免 DataWeb exportRawData 導致回應結構不同而使前端解析為空。
      (reportBody as any).sortingAndDataFormat.reportCustomizations.exportRawData = false;
    } catch (e: any) {
      console.warn('[get-trade-report] Failed to resolve dataToReport:', e?.message);
    }

    // Optional Year-to-Date toggle (keeps fullYears selection but switches yearsTimeline)
    try {
      const enableYtd = String(ytd || '').toLowerCase() === 'true';
      if (enableYtd) {
        const cs = (reportBody as any).searchOptions.componentSettings;
        cs.yearsTimeline = 'Year-to-Date';
      }
    } catch (e: any) {
      console.warn('[get-trade-report] Failed to set YTD toggle:', e?.message);
    } // End of YTD toggle

    // Handle `commodity_select='all'` as a separate, overriding path.
    try {
      if (String(commodity_select || '').toLowerCase() === 'all') {
          const co = (reportBody as any).searchOptions.commodities;
          co.commoditySelectType = 'all';
          co.commodities = [];
          co.commoditiesExpanded = [];
          co.granularity = String((flowResolved === 'balance') ? '6' : (requestedGranularity || '2'));
      } else {
          // Apply country DataSort if `isCountryBreakout` or `flowResolved === 'balance'`.
          // The commodity granularity and aggregation are already set by the new logic.
            if (isCountryBreakout || flowResolved === 'balance') {
            // Country DataSort 提前加 COUNTRY 欄位
            const ds = (reportBody as any).sortingAndDataFormat?.DataSort;
            if (ds) {
              ds.columnOrder = ds.columnOrder || [];
              if (!ds.columnOrder.includes('COUNTRY')) ds.columnOrder.unshift('COUNTRY');
              ds.fullColumnOrder = ds.fullColumnOrder || [];
              const hasC = (ds.fullColumnOrder || []).some((c: any) => String(c?.value||c?.name||'').toUpperCase()==='COUNTRY');
              if (!hasC) ds.fullColumnOrder.unshift({ name: 'Countries', value: 'COUNTRY' });
            }
          }
      }
    } catch (e: any) {
        console.warn('[get-trade-report] Failed during commodity_select handling:', e?.message);
    }

    // Attach countriesExpanded when using explicit list to avoid DataWeb validation errors
    if (reportBody.searchOptions?.countries?.countriesSelectType === 'list' && countryCodes.length) {
      try {
        // This fetch is for non-essential data, so we can leave it as a fetch call.
        const functionsBase = getFunctionsBaseUrl(event);
        const url = new URL(`${functionsBase}/dataweb-proxy`);
        url.searchParams.set('endpoint', '/api/v2/country/getAllCountries');
        const resp = await fetch(url.toString());
        let options: any[] = [];
        if (resp.ok) {
          const data: any = await resp.json();
          options = Array.isArray(data?.options) ? data.options : (Array.isArray(data) ? data : []);
        }
        if (!options.length) {
          options = tryLoadBundledCountries();
        }
        if (options.length) {
          const map = new Map<string, any>();
          for (const opt of options) {
            if (opt && typeof opt.value !== 'undefined') map.set(String(opt.value), opt);
          }
          const expanded = countryCodes.map(code => {
            const opt = map.get(String(code));
            return { name: String(opt?.name || code), value: String(code) };
          });
          (reportBody as any).searchOptions.countries.countriesExpanded = expanded;
        }
      } catch (e) {
        // continue without expanded if all lookups fail
      }
    }

    // Create a mock event to call the adapter handler directly
    const adapterEvent: HandlerEvent = {
      ...event,
      path: '/api/dataweb-adapter',
      httpMethod: 'POST',
      queryStringParameters: {
        ...event.queryStringParameters,
        reportType: 'runReport',
      },
      body: JSON.stringify(reportBody),
    };

    const response = await adapterHandler(adapterEvent, context);

    if (!response || response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Failed to run report: ${response?.statusCode || 'N/A'} ${response?.body || ''}`);
    }

    const rawReport = JSON.parse(response.body || '{}');
    const adapterMode = String(response.headers?.['x-adapter-mode'] || response.headers?.['X-Adapter-Mode'] || 'adapter:direct');
    const cacheHdr = String(response.headers?.['x-cache'] || response.headers?.['X-Cache'] || '');

    // Return raw report and surface adapter/cache headers for observability.
    // Add the meta information to the rawReport
    if (rawReport && typeof rawReport === 'object') {
        rawReport.meta = {
            aggregation: finalAggregation,
            granularity: finalGranularity,
            hts: processedHtsList,
        };
    }
    const hdrs: Record<string,string> = { 'Content-Type': 'application/json', 'X-Adapter-Mode': adapterMode, 'X-Cache': cacheHdr, 'X-Request-ID': requestId };
    try {
      const diagnostic = String(event.queryStringParameters?.['diagnostic'] || '').toLowerCase();
      if (diagnostic === '1' || diagnostic === 'true') {
        hdrs['X-Report-Body'] = JSON.stringify(reportBody);
      }
    } catch (e: any) {
      console.warn('[get-trade-report] Failed to stringify reportBody for diagnostic header:', e?.message);
    }
    // console.log('[get-trade-report] done', { requestId, adapterMode, cacheHdr });
    return { statusCode: 200, headers: hdrs, body: JSON.stringify(rawReport) };

  } catch (err: any) {
    console.error('[get-trade-report] error', { requestId, message: err?.message });
    return { statusCode: 500, headers: { 'X-Request-ID': requestId }, body: JSON.stringify({ error: err.message }) };
  }
};
