import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface UseCompanyRatesQueryArgs {
  documentNumber: string;
  enabled?: boolean;
}

interface CompanyRatesResponse {
  rates?: Array<{ company: string; rate: string }>;
  special_case?: string;
  source_url?: string;
  title?: string | null;
  publication_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  period_text?: string | null;
  heading_text?: string | null;
}

export const useCompanyRatesQuery = ({
  documentNumber,
  enabled = true,
}: UseCompanyRatesQueryArgs) =>
  useQuery<CompanyRatesResponse>({
    queryKey: ['company-rates', documentNumber],
    enabled: enabled && Boolean(documentNumber),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await fetchJson<CompanyRatesResponse>(
        `/api/get-company-rates?document_number=${encodeURIComponent(documentNumber)}`
      );
      return data;
    },
  });
