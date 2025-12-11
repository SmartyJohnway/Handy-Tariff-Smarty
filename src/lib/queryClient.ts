import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
};

export const createQueryClient = () => new QueryClient({
  defaultOptions: defaultQueryOptions,
});
