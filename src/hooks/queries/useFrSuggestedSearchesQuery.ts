import { useQuery } from '@tanstack/react-query';
import { suggestedSearches } from '@/lib/frTsApi2';

interface UseFrSuggestedSearchesQueryArgs {
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrSuggestedSearchesQuery = ({
  debugMode,
  baseUri,
  enabled = false,
}: UseFrSuggestedSearchesQueryArgs) =>
  useQuery({
    queryKey: ['fr-suggested-searches', { debugMode, baseUri }],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const resp = await suggestedSearches({
        base_uri: debugMode ? baseUri : undefined,
      });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      return resp.payload;
    },
  });
