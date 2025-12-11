import { useQuery } from '@tanstack/react-query';
import { topicsSuggestions } from '@/lib/frTsApi2';

interface UseFrTopicsSuggestionsQueryArgs {
  term: string;
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrTopicsSuggestionsQuery = ({
  term,
  debugMode,
  baseUri,
  enabled = true,
}: UseFrTopicsSuggestionsQueryArgs) => {
  const normalized = term.trim();
  return useQuery({
    queryKey: ['fr-topic-suggestions', { term: normalized, debugMode, baseUri }],
    enabled: enabled && Boolean(normalized),
    queryFn: async () => {
      const resp = await topicsSuggestions(normalized, {
        base_uri: debugMode ? baseUri : undefined,
      });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      const raw = Array.isArray(resp.payload?.topics)
        ? resp.payload?.topics
        : [];
      return raw.map((item: any) => item?.attributes ?? item);
    },
  });
};
