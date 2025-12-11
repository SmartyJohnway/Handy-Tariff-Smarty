import { useQuery } from '@tanstack/react-query';
import { sectionsSearch } from '@/lib/frTsApi2';

export interface FrSection {
  slug: string;
  name: string;
}

export const DEFAULT_FR_SECTIONS: FrSection[] = [
  { slug: 'money', name: 'Money' },
  { slug: 'environment', name: 'Environment' },
  { slug: 'world', name: 'World' },
  { slug: 'science-and-technology', name: 'Science & Technology' },
  { slug: 'business-and-industry', name: 'Business & Industry' },
  { slug: 'health-and-public-welfare', name: 'Health & Public Welfare' },
];

interface UseFrSectionsQueryArgs {
  term?: string;
  debugMode: boolean;
  baseUri: string;
  enabled?: boolean;
}

export const useFrSectionsQuery = ({
  term,
  debugMode,
  baseUri,
  enabled = true,
}: UseFrSectionsQueryArgs) => {
  const normalized = term?.trim() || '';
  return useQuery({
    queryKey: ['fr-sections', { term: normalized, debugMode, baseUri }],
    enabled,
    queryFn: async () => {
      const resp = await sectionsSearch({
        term: normalized || undefined,
        base_uri: debugMode ? baseUri : undefined,
      });
      if (resp.status !== 200) {
        throw new Error(resp.payload?.error || `HTTP ${resp.status}`);
      }
      const raw = resp.payload?.sections;
      if (!raw || typeof raw !== 'object') {
        return [];
      }
      return Object.entries(raw).map(([slug, value]) => ({
        slug,
        name: String((value as any)?.name || slug),
      }));
    },
  });
};
