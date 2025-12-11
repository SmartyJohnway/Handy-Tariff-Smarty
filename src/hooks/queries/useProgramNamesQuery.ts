import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api';

interface ProgramName {
  code: string;
  description?: string;
  countriesgroups?: {
    countries?: string[];
    group_name?: string;
  };
}

export type ProgramLookup = Record<
  string,
  {
    desc: string;
    countries: string[];
    group_name: string;
  }
>;

const mapProgramsToLookup = (programs: ProgramName[]): ProgramLookup => {
  return programs.reduce<ProgramLookup>((acc, program) => {
    const key = program.code;
    if (!key) return acc;
    acc[key] = {
      desc: program.description || 'N/A',
      countries: program.countriesgroups?.countries || [],
      group_name: program.countriesgroups?.group_name || 'N/A',
    };
    return acc;
  }, {});
};

export const useProgramNamesQuery = () =>
  useQuery({
    queryKey: ['program-names'],
    queryFn: async () => {
      const { data } = await fetchJson<{ programs?: ProgramName[] }>('/api/get-program-names');
      const programs = Array.isArray(data?.programs) ? data.programs : [];
      return mapProgramsToLookup(programs);
    },
    staleTime: Infinity,
  });
