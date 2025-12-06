import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface BaselineAdapterArgs {
  year: string;
  searchTerm: string;
  enabled?: boolean;
}

export const fetchBaselineAdapter = async (year: string, searchTerm: string) => {
  const params = new URLSearchParams();
  params.set('year', year);
  params.set('search_term', searchTerm);
  const { data } = await fetchJson(`/api/baseline-adapter?${params.toString()}`);
  return data;
};

export const useBaselineAdapterQuery = ({
  year,
  searchTerm,
  enabled = true,
}: BaselineAdapterArgs) =>
  useQuery({
    queryKey: ['baseline-adapter', year, searchTerm],
    enabled: Boolean(year && searchTerm) && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchBaselineAdapter(year, searchTerm),
  });
