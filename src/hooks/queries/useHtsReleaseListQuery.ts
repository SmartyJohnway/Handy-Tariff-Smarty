import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export interface HtsReleaseItem {
  id?: { timestamp?: number; date?: number };
  name?: string;
  description?: string;
  date?: string;
  time?: string;
  title?: string;
  creator?: string;
  status?: string;
  target?: string;
  releaseStartDate?: string;
  releaseEndDate?: string | null;
  mergedRevisions?: unknown;
  formattedDate?: string;
  formattedTime?: string;
  [key: string]: any;
}

export const useHtsReleaseListQuery = () =>
  useQuery({
    queryKey: ['htsReleaseList'],
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: async () => {
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : 'UTC';
      const url = `/api/get-hts-release-list?timezone=${encodeURIComponent(timezone)}`;
      const { data } = await fetchJson<HtsReleaseItem[]>(url);
      return Array.isArray(data) ? data : [];
    },
  });
