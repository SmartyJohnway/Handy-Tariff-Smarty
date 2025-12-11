import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface PublicInspectionArgs {
  date: string;
  debugMode: boolean;
  baseUri: string;
}

export interface PublicInspectionResponse {
  results?: any[];
  [key: string]: any;
}

export const usePublicInspectionQuery = ({
  date,
  debugMode,
  baseUri,
}: PublicInspectionArgs) =>
  useQuery<PublicInspectionResponse>({
    queryKey: ['public-inspection', { date, debugMode, baseUri }],
    enabled: Boolean(date),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('action', 'available_on');
      params.set('date', date);
      if (debugMode) params.set('base_uri', baseUri);
      const { data } = await fetchJson<PublicInspectionResponse>(`/api/fr-ts-pi?${params.toString()}`);
      return data;
    },
  });
