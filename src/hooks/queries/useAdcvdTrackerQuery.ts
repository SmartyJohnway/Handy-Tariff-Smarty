import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface AdcvdTrackerResponse {
  countries?: any[];
  idsLinks?: any[];
  updatedAt?: string | null;
}

export const useAdcvdTrackerQuery = (htsCode: string) =>
  useQuery({
    queryKey: ['adcvd-tracker', htsCode],
    enabled: Boolean(htsCode),
    queryFn: async () => {
      const { data } = await fetchJson<AdcvdTrackerResponse>(
        `/api/get-ad-cvd-tracker?hts_code=${encodeURIComponent(htsCode)}`
      );
      return {
        countries: Array.isArray(data?.countries) ? data.countries : [],
        idsLinks: Array.isArray(data?.idsLinks) ? data.idsLinks : [],
        updatedAt: data?.updatedAt || null,
      };
    },
  });
