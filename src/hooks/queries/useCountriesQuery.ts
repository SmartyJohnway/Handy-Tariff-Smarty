import { useQuery } from '@tanstack/react-query';
import { loadCountriesCached, CountryOption, COUNTRIES_TTL_MS } from '@/utils/countries';

export const useCountriesQuery = () =>
  useQuery<CountryOption[]>({
    queryKey: ['countries'],
    queryFn: loadCountriesCached,
    staleTime: COUNTRIES_TTL_MS,
    gcTime: COUNTRIES_TTL_MS,
  });
