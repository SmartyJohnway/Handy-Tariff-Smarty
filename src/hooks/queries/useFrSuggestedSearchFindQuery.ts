import { useQuery } from '@tanstack/react-query';
import { suggestedSearchFind } from '@/lib/frTsApi2';

interface UseFrSuggestedSearchFindQueryArgs {
  slug: string;
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrSuggestedSearchFindQuery = ({
  slug,
  debugMode,
  baseUri,
  enabled = true,
}: UseFrSuggestedSearchFindQueryArgs) =>
  useQuery({
    queryKey: ['fr-suggested-search-find', { slug, debugMode, baseUri }],
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const resp = await suggestedSearchFind(slug, { base_uri: debugMode ? baseUri : undefined });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      return resp.payload;
    },
    staleTime: 5 * 60 * 1000,
  });
