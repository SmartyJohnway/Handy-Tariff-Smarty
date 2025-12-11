export type SearchParams = {
  term?: string;
  per_page?: number;
  page?: number;
  order?: string;
  facets?: string[];
  base_uri?: string;
  conditions?: Record<string, any>;
  debug?: boolean;
  // advanced flags
  includeHeaders?: boolean;
  skipCache?: boolean;
};

export type SearchResponse = { url: string; payload: any; status: number; headers?: Record<string, string> };

const __cache = new Map<string, any>();
const getCached = (u: string) => { try { return __cache.get(u); } catch { return undefined; } };
const setCached = (u: string, v: any) => { try { __cache.set(u, v); } catch {} };

function appendParam(sp: URLSearchParams, key: string, val: any) {
  if (val === undefined || val === null || val === '') return;
  if (Array.isArray(val)) {
    for (const item of val) appendParam(sp, `${key}[]`, item);
  } else if (typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) appendParam(sp, `${key}[${k}]`, v);
  } else {
    const strVal = String(val);
    if (key.endsWith('[]') || sp.has(key)) sp.append(key, strVal);
    else sp.set(key, strVal);
  }
}

async function fetchMaybeCached(url: URL, opts?: { includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const urlStr = url.toString();
  if (!opts?.includeHeaders && !opts?.skipCache) {
    const cached = getCached(urlStr);
    if (cached) return { url: urlStr, payload: cached, status: 200 };
  }
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  const headers: Record<string, string> = {};
  try { for (const [k, v] of (res.headers as any).entries()) headers[k.toLowerCase()] = String(v); } catch {}
  if (res.ok && !opts?.includeHeaders && !opts?.skipCache) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status, headers };
}

export async function searchDocuments(params: SearchParams): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-search', window.location.origin);
  const termInConditions = !!(params.conditions && typeof (params.conditions as any).term === 'string' && (params.conditions as any).term.trim());
  if (params.term && !termInConditions) url.searchParams.set('conditions[term]', params.term);
  if (params.per_page) url.searchParams.set('per_page', String(params.per_page));
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.order) url.searchParams.set('order', String(params.order));
  if (params.facets?.length) url.searchParams.set('facets', params.facets.join(','));
  if (params.base_uri) url.searchParams.set('base_uri', params.base_uri);
  if (params.debug) url.searchParams.set('debug', '1');
  // request highlight snippets for excerpts rendering
  url.searchParams.set('highlight', 'true');
  if (params.conditions) {
    for (const [k, v] of Object.entries(params.conditions)) appendParam(url.searchParams, `conditions[${k}]`, v);
  }
  return fetchMaybeCached(url, { includeHeaders: params.includeHeaders, skipCache: params.skipCache });
}

export async function findDocument(document_number: string, opts?: { base_uri?: string; fields?: string[]; publication_date?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-find', window.location.origin);
  url.searchParams.set('document_number', document_number);
  if (opts?.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.publication_date) url.searchParams.set('publication_date', opts.publication_date);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function agenciesAll(opts?: { fields?: string[]; base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'all');
  if (opts?.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function agenciesFind(idOrSlug: string, opts?: { fields?: string[]; base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'find');
  url.searchParams.set('id', idOrSlug);
  if (opts?.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function agenciesSuggestions(term?: string, opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'suggestions');
  if (term) url.searchParams.set('term', term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function piCurrent(opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'current');
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function piAvailableOn(date: string, opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'available_on');
  url.searchParams.set('date', date);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function piSearch(term?: string, opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'search');
  if (term) url.searchParams.set('term', term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function getSearchDetails(opts?: { for?: 'documents' | 'public_inspection'; term?: string; conditions?: Record<string, any>; base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-search-details', window.location.origin);
  if (opts?.for) url.searchParams.set('for', opts.for);
  if (opts?.term) url.searchParams.set('conditions[term]', opts.term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  if (opts?.conditions) {
    for (const [k, v] of Object.entries(opts.conditions)) appendParam(url.searchParams, `conditions[${k}]`, v);
  }
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function suggestedSearches(opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-suggested-searches', window.location.origin);
  url.searchParams.set('action', 'search');
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function suggestedSearchFind(slug: string, opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-suggested-searches', window.location.origin);
  url.searchParams.set('action', 'find');
  url.searchParams.set('slug', slug);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function sectionsSearch(opts?: { term?: string; base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-sections', window.location.origin);
  if (opts?.term) url.searchParams.set('term', opts.term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function topicsSuggestions(term?: string, opts?: { base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-topics', window.location.origin);
  if (term) url.searchParams.set('term', term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}

export async function facetSearch(facet: string, opts?: { page?: number; conditions?: Record<string, any>; base_uri?: string; includeHeaders?: boolean; skipCache?: boolean }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-facet', window.location.origin);
  url.searchParams.set('facet', facet);
  if (opts?.page) url.searchParams.set('page', String(opts.page));
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  if (opts?.conditions) {
    for (const [k, v] of Object.entries(opts.conditions)) appendParam(url.searchParams, `conditions[${k}]`, v);
  }
  return fetchMaybeCached(url, { includeHeaders: opts?.includeHeaders, skipCache: opts?.skipCache });
}
