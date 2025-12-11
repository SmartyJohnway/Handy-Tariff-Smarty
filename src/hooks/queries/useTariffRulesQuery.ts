import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

const CACHE_KEY = 'tariff_rules_cache_v1';

export interface TariffDetail {
  hts?: string;
  sub_hts?: string;
  desc?: string;
}

export interface TariffTariffs {
  sec232?: { applicable: boolean; rate: string; note: string };
  sec301?: { applicable: boolean; rate: string; note: string };
  ad_cvd?: { applicable: boolean; note: string };
}

export interface TariffItem {
  description: string;
  chapter: string;
  material: string;
  isDerivative: boolean;
  details?: TariffDetail[];
  tariffs?: TariffTariffs;
}

export const getCachedTariffRules = (): TariffItem[] | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const cached = window.sessionStorage.getItem(CACHE_KEY);
    if (!cached) return undefined;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const persistRulesCache = (data: TariffItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
};

export const useTariffRulesQuery = () =>
  useQuery<TariffItem[]>({
    queryKey: ['tariff-rules'],
    initialData: getCachedTariffRules(),
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await fetchJson<TariffItem[]>('/assets/data/tariff_rules.json');
      if (!Array.isArray(data)) {
        throw new Error('tariff_rules.json 格式不正確');
      }
      persistRulesCache(data);
      return data;
    },
  });
