﻿import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

export interface HtsFootnote { columns: string[]; value: string; }
export interface HtsItem { htsno: string; indent: string; description: string; superior: string | null; units: string[]; general: string; special: string; other: string; col2: string; quotaQuantity: string | null; additionalDuties: string | null; footnotes: HtsFootnote[] | null; statisticalSuffix?: string; }

export const fetchHtsDetails = async (htsCode: string) => {
  const { data } = await fetchJson<unknown>(`/api/get-hts-details?hts_code=${encodeURIComponent(htsCode)}`);
  return data;
};

export const fetchHtsSearchResults = async (term: string) => {
  const proxyUrl = `/.netlify/functions/hts-proxy?keyword=${encodeURIComponent(term)}`;
  const { data } = await fetchJson<{ results: HtsItem[]; error?: string }>(proxyUrl);
  if (!Array.isArray(data.results)) {
    throw new Error(data.error || 'API 回傳資料格式異常');
  }
  return data.results;
};

interface UseHtsSearchQueryArgs {
  term: string;
  enabled: boolean;
}

export const useHtsSearchQuery = ({ term, enabled }: UseHtsSearchQueryArgs) => {
  return useQuery<HtsItem[]>({
    queryKey: ['hts-search', term],
    enabled,
    queryFn: () => fetchHtsSearchResults(term),
  });
};
