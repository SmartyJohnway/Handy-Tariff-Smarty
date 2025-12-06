import { useMutation } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface CommodityTranslationArgs {
  hts8: string;
  year: string;
}

export const useCommodityTranslationMutation = () =>
  useMutation({
    mutationFn: async ({ hts8, year }: CommodityTranslationArgs) => {
      const { data } = await fetchJson<any>('/api/dataweb-adapter?translation=commodity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hts8, year }),
      });
      return data;
    },
  });
