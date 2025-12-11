import { useQuery } from '@tanstack/react-query';
import { fetchHtsDetails } from '@/hooks/queries/useHtsSearchQuery';

export const useHtsDetailsQuery = (htsCode: string) =>
  useQuery({
    queryKey: ['hts-details', htsCode],
    queryFn: () => fetchHtsDetails(htsCode),
    enabled: Boolean(htsCode),
  });
