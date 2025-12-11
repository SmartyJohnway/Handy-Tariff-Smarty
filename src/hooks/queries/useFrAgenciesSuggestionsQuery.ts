import { useQuery } from '@tanstack/react-query';
import { agenciesSuggestions } from '@/lib/frTsApi2';

interface UseFrAgenciesSuggestionsQueryArgs {
  term: string;
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrAgenciesSuggestionsQuery = ({
  term,
  debugMode,
  baseUri,
  enabled = true,
}: UseFrAgenciesSuggestionsQueryArgs) => {
  const normalized = term.trim();
  return useQuery({
    queryKey: ['fr-agency-suggestions', { term: normalized, debugMode, baseUri }],
    enabled: enabled && Boolean(normalized),
    queryFn: async () => {
      const resp = await agenciesSuggestions(normalized, {
        base_uri: debugMode ? baseUri : undefined,
      });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      const raw = Array.isArray(resp.payload?.agencies)
        ? resp.payload?.agencies
        : [];
      return raw.map((item: any) => item?.attributes ?? item);
    },
  });
};
