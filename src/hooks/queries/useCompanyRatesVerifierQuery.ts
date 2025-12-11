import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export interface CompanyRatesVerifierParams {
  hts_code: string;
  agencies?: string;
  type?: string;
  per_page?: number;
  chunk_size?: number;
  perCountryMin?: number;
  fetchCap?: number;
  tableCheckCap?: number;
  legalTerms?: string;
  includeCountry?: boolean;
  countryBroadcast?: boolean;
  enableScoring?: boolean;
  addTableSignals?: boolean;
  tableCheckMode?: string;
  tableCheckTopN?: number;
  scoreWeights?: string;
  customTerms?: string;
}

export const useCompanyRatesVerifierQuery = (params: CompanyRatesVerifierParams | null) =>
  useQuery({
    queryKey: ['company-rates-verifier', params],
    enabled: Boolean(params),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!params) {
        throw new Error('Missing verifier parameters');
      }
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        search.set(key, String(value));
      });
      const { data } = await fetchJson(`/api/get-company-rates-verifier?${search.toString()}`);
      return data;
    },
  });
