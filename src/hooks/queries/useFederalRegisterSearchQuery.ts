import { useQuery } from '@tanstack/react-query';
import { searchDocuments } from '@/lib/frTsApi2';
import { normalizeResults, NormalizedFRDoc } from '@/lib/frNormalize';

export interface FederalRegisterSearchArgs {
  term: string;
  perPage: number;
  page: number;
  order: string;
  facets: string[];
  conditions: Record<string, any>;
  debugMode: boolean;
  baseUri?: string;
}

export interface FederalRegisterSearchResult {
  docs: NormalizedFRDoc[];
  payload: any;
  totalPages: number;
  url: string;
  debugInfo: any;
}

export const useFederalRegisterSearchQuery = (
  args: FederalRegisterSearchArgs | null,
  enabled: boolean
) =>
  useQuery<FederalRegisterSearchResult>({
    queryKey: ['federal-register-search', args],
    enabled: Boolean(enabled && args),
    queryFn: async () => {
      if (!args) {
        throw new Error('Search parameters are required');
      }
      const resp = await searchDocuments({
        term: args.term || undefined,
        per_page: args.perPage,
        page: args.page,
        order: args.order,
        facets: args.facets,
        conditions: args.conditions,
        debug: args.debugMode,
        base_uri: args.debugMode ? args.baseUri : undefined,
      });

      const status = resp.status ?? 200;
      if (status !== 200) {
        const message =
          (resp.payload && (resp.payload.error || resp.payload.message)) || `HTTP ${status}`;
        throw new Error(message);
      }

      const payload = resp.payload;
      const docs = normalizeResults(payload) as NormalizedFRDoc[];
      const totalPages =
        typeof payload?.total_pages === 'number'
          ? payload.total_pages
          : typeof payload?.documents?.total_pages === 'number'
            ? payload.documents.total_pages
            : 0;

      return {
        docs,
        payload,
        totalPages: totalPages || 0,
        url: resp.url,
        debugInfo: payload?.__debug ?? null,
      };
    },
  });
