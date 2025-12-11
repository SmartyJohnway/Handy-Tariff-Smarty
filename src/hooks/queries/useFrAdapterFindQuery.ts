import { useQuery } from '@tanstack/react-query';
import { findDocument } from '@/lib/frTsApi2';

export interface FrAdapterFindResult {
  payload: any;
  url: string;
  headers: Record<string, string>;
  adapterMode: string;
}

interface UseFrAdapterFindQueryArgs {
  documentNumber: string;
  enabled?: boolean;
  baseUri?: string;
}

export const fetchFrAdapterFind = async (documentNumber: string, baseUri?: string) => {
  const resp = await findDocument(documentNumber.trim(), { includeHeaders: true, skipCache: true, base_uri: baseUri });
  if (resp.status !== 200) {
    throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
  }
  const headers = resp.headers || {};
  const adapterMode =
    headers['x-adapter-mode'] ||
    (typeof resp.payload?.adapter_mode === 'string' ? resp.payload.adapter_mode : '');
  return { payload: resp.payload, url: resp.url, headers, adapterMode };
};

export const useFrAdapterFindQuery = ({
  documentNumber,
  enabled = true,
  baseUri,
}: UseFrAdapterFindQueryArgs) =>
  useQuery<FrAdapterFindResult>({
    queryKey: ['fr-adapter-find', documentNumber, baseUri],
    enabled: enabled && Boolean(documentNumber),
    queryFn: () => fetchFrAdapterFind(documentNumber, baseUri),
    staleTime: 0,
  });
