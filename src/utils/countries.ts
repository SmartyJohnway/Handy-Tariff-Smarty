import { fetchJson } from '../lib/api';

export interface CountryOption {
  name: string; // e.g., "Japan - JP - JPN"
  value: string; // DataWeb country code e.g., "5880"
  iso2?: string;
  iso3?: string;
}

export interface CountriesPayload {
  options: CountryOption[];
}

const LOCAL_KEY = 'dw_countries_cache_v1';
export const COUNTRIES_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const DATAWEB_ENDPOINT = '/api/dataweb-proxy?endpoint=/api/v2/country/getAllCountries';

const assetCandidateUrls = [
  '/dist/assets/data/countries.json',
  '/assets/data/countries.json',
];

const readCache = (): CountryOption[] | null => {
  try {
    const cached = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    if (cached && Date.now() - cached.ts < COUNTRIES_TTL_MS && Array.isArray(cached.options)) {
      return cached.options as CountryOption[];
    }
  } catch {}
  return null;
};

const writeCache = (options: CountryOption[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ts: Date.now(), options }));
  } catch {}
};

const mapOptions = (payload: CountriesPayload | CountryOption[]): CountryOption[] => {
  if (Array.isArray((payload as CountriesPayload)?.options)) {
    return (payload as CountriesPayload).options;
  }
  return Array.isArray(payload) ? (payload as CountryOption[]) : [];
};

async function fetchFromAssets(): Promise<CountryOption[] | null> {
  for (const url of assetCandidateUrls) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) continue;
      const data = (await res.json()) as CountriesPayload | CountryOption[];
      const options = mapOptions(data);
      if (options.length) return options;
    } catch {
      // ignore asset errors
    }
  }
  return null;
}

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  try {
    const raw = (localStorage.getItem('dataweb_api_key') || '').trim();
    if (raw) headers['x-dw-auth'] = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
  } catch {}
  return headers;
};

export const fetchCountriesFromApi = async (): Promise<CountryOption[]> => {
  const { data } = await fetchJson<CountriesPayload | CountryOption[]>(DATAWEB_ENDPOINT, {
    headers: buildHeaders(),
  });
  return mapOptions(data);
};

export async function loadCountriesCached(): Promise<CountryOption[]> {
  const cached = readCache();
  if (cached) return cached;

  const assetOptions = await fetchFromAssets();
  if (assetOptions?.length) {
    writeCache(assetOptions);
    return assetOptions;
  }

  try {
    const apiOptions = await fetchCountriesFromApi();
    if (apiOptions.length) {
      writeCache(apiOptions);
      return apiOptions;
    }
  } catch {
    // swallow errors and fall through
  }

  return [];
}

export async function refreshCountries(): Promise<CountryOption[]> {
  const options = await fetchCountriesFromApi();
  writeCache(options);
  return options;
}

export function mapCountryNamesToCodes(countryNames: string[], options: CountryOption[]): string[] {
  if (!options?.length || !countryNames?.length) return [];
  const nameMap = new Map<string, string>();
  for (const opt of options) {
    const base = String(opt.name).split(' - ')[0].trim().toLowerCase();
    nameMap.set(base, opt.value);
  }
  const codes: string[] = [];
  for (const n of countryNames) {
    const code = nameMap.get(String(n).trim().toLowerCase());
    if (code) codes.push(code);
  }
  return Array.from(new Set(codes));
}

export function cleanHtsToSix(htsCode: string): string {
  const clean = (htsCode || '').replace(/\D/g, '');
  return clean.slice(0, 6);
}

export function lastNYearsFromData(yearLabels: string[], maxN = 5): string[] {
  if (!Array.isArray(yearLabels)) return [];
  const arr = [...yearLabels];
  return arr.slice(Math.max(0, arr.length - maxN));
}
