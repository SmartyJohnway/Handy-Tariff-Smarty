import type { NormalizedFRDoc } from '@/lib/frNormalize';
import { normalizeFind } from '@/lib/frNormalize';
import { fetchFrAdapterFind } from '@/hooks/queries/useFrAdapterFindQuery';
import type { QueryClient } from '@tanstack/react-query';

interface FetchOptions {
  baseUri?: string;
}

export interface FrDocDetailResult {
  normalized: NormalizedFRDoc | null;
  raw: any;
  url: string;
  adapterMode?: string;
}

export const fetchNormalizedFrDoc = async (
  queryClient: QueryClient,
  documentNumber: string,
  options?: FetchOptions,
): Promise<FrDocDetailResult> => {
  const keyBase = options?.baseUri || '';
  const { payload, url, adapterMode } = await queryClient.fetchQuery({
    queryKey: ['fr-adapter-find', keyBase, documentNumber],
    queryFn: () => fetchFrAdapterFind(documentNumber, options?.baseUri),
  });
  const rawDoc = payload?.document || payload;
  const normalized = normalizeFind(payload);
  return {
    normalized,
    raw: rawDoc,
    url,
    adapterMode,
  };
};

