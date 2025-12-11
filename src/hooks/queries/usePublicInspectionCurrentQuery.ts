import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';
import type { PublicInspectionResponse } from './usePublicInspectionQuery';

interface UsePublicInspectionCurrentQueryArgs {
  debugMode: boolean;
  baseUri: string;
  enabled: boolean;
}

export const usePublicInspectionCurrentQuery = ({
  debugMode,
  baseUri,
  enabled,
}: UsePublicInspectionCurrentQueryArgs) =>
  useQuery<PublicInspectionResponse>({
    queryKey: ['public-inspection-current', { debugMode, baseUri }],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('action', 'current');
      if (debugMode) params.set('base_uri', baseUri);
      const { data } = await fetchJson<PublicInspectionResponse>(`/api/fr-ts-pi?${params.toString()}`);
      return data;
    },
  });
