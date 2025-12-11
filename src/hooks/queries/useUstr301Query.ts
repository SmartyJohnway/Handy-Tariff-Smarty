import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export type UstrSortKey = 'hts' | 'list' | 'rate' | 'effective' | 'action';
export type UstrSortDir = 'asc' | 'desc';

export interface Ustr301QueryArgs {
  q: string;
  list: string;
  rate: string;
  page: number;
  pageSize: number;
  sortKey: UstrSortKey;
  sortDir: UstrSortDir;
}

export interface Ustr301Item {
  hts: string;
  description: string;
  list: string | null;
  list_label: string | null;
  list_base: string | null;
  action_title: string | null;
  max_rate_text: string | null;
  effective_date: string | null;
  note: string | null;
}

export interface Ustr301QueryResult {
  items: Ustr301Item[];
  total: number;
  listOptions: string[];
  rateOptions: string[];
}

export const useUstr301Query = (args: Ustr301QueryArgs) =>
  useQuery<Ustr301QueryResult>({
    queryKey: ['ustr-301', args],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (args.q) params.set('q', args.q);
      if (args.list && args.list !== 'ALL') params.set('list', args.list);
      if (args.rate && args.rate !== 'ALL') params.set('rate', args.rate);
      params.set('page', String(args.page));
      params.set('pageSize', String(args.pageSize));
      params.set('sortKey', args.sortKey);
      params.set('sortDir', args.sortDir);
      const { data } = await fetchJson<{ items?: Ustr301Item[]; total?: number; listOptions?: string[]; rateOptions?: string[] }>(
        `/api/get-ustr-301?${params.toString()}`
      );
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: typeof data.total === 'number' ? data.total : 0,
        listOptions: Array.isArray(data.listOptions) ? data.listOptions : [],
        rateOptions: Array.isArray(data.rateOptions) ? data.rateOptions : [],
      };
    },
  });
