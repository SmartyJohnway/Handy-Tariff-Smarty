import { QueryKey, useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/api';

type MarketTrendsChartPayload = any;

export interface MarketTrendsChartQueryResult {
  payload: MarketTrendsChartPayload;
  adapterMode: string;
  adapterCache: string;
  requestId: string;
  lastReportBody: string;
  diagDurationMs: number | null;
  secondary?: any;
  tertiary?: any;
}

interface UseMarketTrendsChartQueryArgs {
  queryKey: QueryKey;
  buildUrl: () => string;
  buildSecondaryUrl?: () => string | null;
  buildTertiaryUrl?: () => string | null;
  enabled?: boolean;
}

export const useMarketTrendsChartQuery = ({
  queryKey,
  buildUrl,
  buildSecondaryUrl,
  buildTertiaryUrl,
  enabled,
}: UseMarketTrendsChartQueryArgs) => {
  return useQuery<MarketTrendsChartQueryResult, Error, MarketTrendsChartQueryResult, QueryKey>({
    queryKey,
    enabled,
    // 保留快取，避免頁面切換後資料消失；僅在使用者按 Refresh 時再 refetch
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: async ({ signal }) => {
      const urlPrimary = buildUrl();
      const urlSecondary = buildSecondaryUrl ? buildSecondaryUrl() : null;
      const urlTertiary = buildTertiaryUrl ? buildTertiaryUrl() : null;
      const start =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const [primaryResp, secondaryRaw, tertiaryRaw] = await Promise.all([
        fetchJson<MarketTrendsChartPayload>(urlPrimary, { signal }),
        urlSecondary
          ? fetch(urlSecondary, { signal }).then(async (r) => ({
              response: r,
              text: await r.text(),
            }))
          : Promise.resolve(null),
        urlTertiary
          ? fetch(urlTertiary, { signal }).then(async (r) => ({
              response: r,
              text: await r.text(),
            }))
          : Promise.resolve(null),
      ]);
      const end =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const diagDurationMs = Number.isFinite(end - start) ? Math.max(0, end - start) : null;

      let secondaryParsed: any = null;
      if (secondaryRaw) {
        try {
          secondaryParsed = JSON.parse(secondaryRaw.text);
        } catch {
          secondaryParsed = secondaryRaw.text;
        }
      }

      let tertiaryParsed: any = null;
      if (tertiaryRaw) {
        try {
          tertiaryParsed = JSON.parse(tertiaryRaw.text);
        } catch {
          tertiaryParsed = tertiaryRaw.text;
        }
      }

      return {
        payload: primaryResp.data,
        adapterMode: primaryResp.response.headers.get('X-Adapter-Mode') || '',
        adapterCache: primaryResp.response.headers.get('X-Cache') || '',
        requestId: primaryResp.response.headers.get('X-Request-ID') || '',
        lastReportBody: primaryResp.response.headers.get('X-Report-Body') || '',
        diagDurationMs,
        secondary: secondaryParsed,
        tertiary: tertiaryParsed,
      };
    },
  });
};
