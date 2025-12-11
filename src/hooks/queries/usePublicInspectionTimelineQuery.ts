import { useQuery } from '@tanstack/react-query';
import { getSearchDetails } from '@/lib/frTsApi2';

interface PublicInspectionTimelineArgs {
  debugMode: boolean;
  baseUri: string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

interface PublicInspectionTimelineResult {
  payload: any;
  url: string;
}

export const usePublicInspectionTimelineQuery = ({
  debugMode,
  baseUri,
  startDate,
  endDate,
  enabled = true,
}: PublicInspectionTimelineArgs) =>
  useQuery<PublicInspectionTimelineResult>({
    queryKey: ['public-inspection-timeline', { debugMode, baseUri, startDate, endDate }],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const resp = await getSearchDetails({
        for: 'public_inspection',
        base_uri: debugMode ? baseUri : undefined,
        conditions: startDate || endDate
          ? {
              publication_date: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : undefined,
      });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      return { payload: resp.payload, url: resp.url };
    },
  });
