import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export const useHtsDatasetQuery = (fileName: string, enabled = true) =>
  useQuery({
    queryKey: ['hts-dataset', fileName],
    enabled: Boolean(fileName) && enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await fetchJson<any>(`/assets/data/${fileName}`);
      return data;
    },
  });
