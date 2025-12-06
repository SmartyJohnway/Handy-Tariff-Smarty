import { QueryKey, useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

type TradeReportPayload = any;

export interface TradeReportQueryResult {
  payload: TradeReportPayload;
  adapterMode: string;
  adapterCache: string;
  requestId: string;
  lastReportBody: string;
  diagDurationMs: number | null;
}

interface UseAdvancedTrendsQueryArgs {
  queryKey: QueryKey;
  buildUrl: () => string;
  enabled?: boolean;
}

export const useAdvancedTrendsQuery = ({ queryKey, buildUrl, enabled = false }: UseAdvancedTrendsQueryArgs) => {
  return useQuery<TradeReportQueryResult>({
    queryKey,
    enabled,
    gcTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const url = buildUrl();
      const start = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
      const { data, response } = await fetchJson<TradeReportPayload>(url, { signal });
      const end = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
      const diagDurationMs = Number.isFinite(end - start) ? Math.max(0, end - start) : null;
      return {
        payload: data,
        adapterMode: response.headers.get('X-Adapter-Mode') || '',
        adapterCache: response.headers.get('X-Cache') || '',
        requestId: response.headers.get('X-Request-ID') || '',
        lastReportBody: response.headers.get('X-Report-Body') || '',
        diagDurationMs,
      };
    },
  });
};
