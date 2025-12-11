import { useQuery } from '@tanstack/react-query';
import { searchDocuments } from '@/lib/frTsApi2';

export interface FrAdapterSearchArgs {
  term?: string;
  conditions?: Record<string, any>;
  per_page?: number;
  facets?: string[];
  debug?: boolean;
}

export interface FrAdapterSearchResult {
  payload: any;
  url: string;
  headers: Record<string, string>;
  adapterMode: string;
}

interface UseFrAdapterSearchQueryOptions {
  enabled?: boolean;
}

export const fetchFrAdapterSearch = async (args: FrAdapterSearchArgs) => {
  const resp = await searchDocuments({
    ...args,
    includeHeaders: true,
    skipCache: true,
  });
  if (resp.status !== 200) {
    throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
  }
  const headers = resp.headers || {};
  const adapterMode =
    headers['x-adapter-mode'] ||
    (typeof resp.payload?.adapter_mode === 'string' ? resp.payload.adapter_mode : '');
  return { payload: resp.payload, url: resp.url, headers, adapterMode };
};

export const useFrAdapterSearchQuery = (
  args: FrAdapterSearchArgs | null,
  options: UseFrAdapterSearchQueryOptions = {},
) =>
  useQuery<FrAdapterSearchResult>({
    queryKey: ['fr-adapter-search', args],
    enabled: Boolean(args) && options.enabled !== false,
    queryFn: async () => {
      if (!args) throw new Error('Missing search arguments');
      return fetchFrAdapterSearch(args);
    },
    staleTime: 0,
  });
