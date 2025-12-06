import { useMutation } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface SearchDetailsArgs {
  date: string;
  debugMode: boolean;
  baseUri: string;
}

export const usePublicInspectionSearchDetailsMutation = () =>
  useMutation({
    mutationFn: async ({ date, debugMode, baseUri }: SearchDetailsArgs) => {
      const params = new URLSearchParams();
      params.set('kind', 'public_inspection');
      params.set('conditions[available_on]', date);
      if (debugMode) params.set('base_uri', baseUri);
      const { data } = await fetchJson(`/api/fr-ts-search-details?${params.toString()}`);
      return data;
    },
  });
