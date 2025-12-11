import { useQuery } from '@tanstack/react-query';
import { searchDocuments, SearchResponse } from '@/lib/frTsApi2';
import { normalizeResults, NormalizedFRDoc } from '@/lib/frNormalize';

export interface UseFrDocumentsArgs {
  term: string;
  perPage: number;
  order?: string;
  debug?: boolean;
  skipCache?: boolean;
  enabled?: boolean;
}

export interface FrDocumentsResult {
  docs: NormalizedFRDoc[];
  headers: Record<string, string>;
  fetchUrl: string;
  raw: SearchResponse;
}

export const useFrDocumentsQuery = ({
  term,
  perPage,
  order = 'newest',
  debug = false,
  skipCache = true,
  enabled,
}: UseFrDocumentsArgs) =>
  useQuery({
    queryKey: ['fr-documents', { term, perPage, order, debug, skipCache }],
    enabled: enabled ?? Boolean(term),
    queryFn: async (): Promise<FrDocumentsResult> => {
      const resp = await searchDocuments({
        term: term || undefined,
        per_page: perPage,
        order,
        debug,
        includeHeaders: true,
        skipCache,
      });
      const docs = normalizeResults(resp.payload) as NormalizedFRDoc[];
      return {
        docs,
        headers: resp.headers || {},
        fetchUrl: resp.url,
        raw: resp,
      };
    },
  });
