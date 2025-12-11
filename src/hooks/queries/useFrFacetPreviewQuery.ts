import { useQuery } from '@tanstack/react-query';
import { facetSearch } from '@/lib/frTsApi2';

export interface FrFacetPreviewArgs {
  facet: string;
  page: number;
  conditions: Record<string, any>;
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export interface FrFacetPreviewResult {
  items: any[];
  totalPages: number;
  raw?: any;
}

export const useFrFacetPreviewQuery = ({
  facet,
  page,
  conditions,
  debugMode,
  baseUri,
  enabled = true,
}: FrFacetPreviewArgs) =>
  useQuery<FrFacetPreviewResult>({
    queryKey: ['fr-facet-preview', facet, page, conditions, debugMode, baseUri],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const result = await facetSearch(facet, {
        page,
        conditions,
        base_uri: debugMode ? baseUri : undefined,
      });
      if (result.status !== 200) {
        throw new Error(result.payload?.error || `HTTP ${result.status}`);
      }
      const payload = result.payload;
      const rawItems =
        (payload?.results || payload?.payload?.results || []).map((x: any) => x?.attributes ?? x);
      const totalPages =
        (payload?.total_pages ?? payload?.payload?.total_pages ?? 1) as number;
      return { items: rawItems, totalPages, raw: payload };
    },
  });
