import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export interface AdcvdResult {
  id?: string;
  case_number?: string;
  country?: string;
  product?: string;
  commodity?: string;
  url?: string;
  hts_numbers?: string[];
}

export interface AdcvdResponse {
  total?: number;
  count?: number;
  offset?: number;
  results?: AdcvdResult[];
}

export interface UseAdcvdOrdersQueryArgs {
  q: string;
  size: number;
  offset: number;
  enabled?: boolean;
}

const normalizeAdcvdResponse = (raw: AdcvdResponse): AdcvdResponse => {
  return {
    total: raw?.total ?? 0,
    count: raw?.count ?? 0,
    offset: raw?.offset ?? 0,
    results: Array.isArray(raw?.results)
      ? raw.results.map((r) => ({
          id: r?.id ?? '',
          case_number: r?.case_number ?? '',
          country: r?.country ?? '',
          product: r?.product ?? '',
          commodity: r?.commodity ?? '',
          url: r?.url ?? '',
          hts_numbers: Array.isArray(r?.hts_numbers) ? r.hts_numbers : [],
        }))
      : [],
  };
};

export const useAdcvdOrdersQuery = ({ q, size, offset, enabled = true }: UseAdcvdOrdersQueryArgs) => {
  return useQuery<AdcvdResponse>({
    queryKey: ['adcvd-orders', { q, size, offset }],
    enabled: enabled && Boolean(q),
    queryFn: async () => {
      const params = new URLSearchParams({
        q,
        size: String(size),
        offset: String(offset),
      });
      const { data } = await fetchJson<AdcvdResponse>(`/api/adcvd-orders?${params.toString()}`);
      return normalizeAdcvdResponse(data || {});
    },
  });
};

