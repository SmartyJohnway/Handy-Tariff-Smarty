import { useQuery } from '@tanstack/react-query';
import { agenciesAll } from '@/lib/frTsApi2';

interface UseFrAgenciesAllQueryArgs {
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrAgenciesAllQuery = ({ debugMode, baseUri, enabled = true }: UseFrAgenciesAllQueryArgs) =>
  useQuery({
    queryKey: ['fr-agencies-all', { debugMode, baseUri }],
    enabled,
    queryFn: async () => {
      const resp = await agenciesAll({ base_uri: debugMode ? baseUri : undefined });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      return Array.isArray(resp.payload?.agencies) ? resp.payload.agencies : [];
    },
  });
