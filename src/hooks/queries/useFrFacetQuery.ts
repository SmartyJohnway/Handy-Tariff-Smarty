import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { facetSearch } from '@/lib/frTsApi2';

export interface FrFacetQueryArgs {
  facet: string;
  page: number;
  conditions: Record<string, any>;
  term?: string;
  debugMode: boolean;
  baseUri: string;
}

export interface FrFacetQueryResult {
  items: any[];
  totalPages: number;
}

export const useFrFacetQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (args: FrFacetQueryArgs): Promise<FrFacetQueryResult> => {
      const queryKey = ['fr-facet', args];
      return queryClient.fetchQuery({
        queryKey,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          const resp = await facetSearch(args.facet, {
            page: args.page,
            conditions: args.conditions,
            base_uri: args.debugMode ? args.baseUri : undefined,
          });
          if (resp.status !== 200) {
            throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
          }
          const payload = resp.payload;
          const rawItems =
            (payload?.results || payload?.payload?.results || []).map(
              (x: any) => x?.attributes ?? x,
            );
          const totalPages =
            (payload?.total_pages ??
              payload?.payload?.total_pages ??
              1) as number;
          return { items: rawItems, totalPages };
        },
      });
    },
    [queryClient],
  );
};
