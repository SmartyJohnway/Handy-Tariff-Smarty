export type SearchParams = {
  term?: string;
  per_page?: number;
  page?: number;
  order?: string;
  facets?: string[]; // e.g., ['agency','daily'] to trigger aggregated
  base_uri?: string; // optional override for testing
  conditions?: Record<string, any>; // nested conditions to be encoded as bracket params
};

export type SearchResponse = {};

const __cache = new Map<string, any>();
const getCached = (u: string) => { try { return __cache.get(u); } catch { return undefined; } };
const setCached = (u: string, v: any) => { try { __cache.set(u, v); } catch {} };

function appendParam(sp: URLSearchParams, key: string, val: any) {
  if (val === undefined || val === null || val === "") return;
  if (Array.isArray(val)) {
    // 對於陣列，逐一以 key[] 追加，避免只保留最後一筆
    for (const item of val) appendParam(sp, `${key}[]`, item);
  } else if (typeof val === 'object') {
    // 物件以 bracket 巢狀方式展開
    for (const [k, v] of Object.entries(val)) appendParam(sp, `${key}[${k}]`, v);
  } else {
    const strVal = String(val);
    // 若 key 以 [] 結尾或已存在，改用 append 以保留多值
    if (key.endsWith('[]') || sp.has(key)) sp.append(key, strVal);
    else sp.set(key, strVal);
  }
}

export async function searchDocuments(params: SearchParams): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-search', window.location.origin);
  // prefer bracket params for term; 若 conditions.term 已存在則避免重複
  const termInConditions = !!(params.conditions && typeof (params.conditions as any).term === 'string' && (params.conditions as any).term.trim());
  if (params.term && !termInConditions) {
    url.searchParams.set('conditions[term]', params.term);
  }
  if (params.per_page) url.searchParams.set('per_page', String(params.per_page));
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.order) url.searchParams.set('order', String(params.order));
  if (params.facets && params.facets.length > 0) url.searchParams.set('facets', params.facets.join(','));
  if (params.base_uri) url.searchParams.set('base_uri', params.base_uri);
  if (params.conditions && typeof params.conditions === 'object') {
    for (const [k, v] of Object.entries(params.conditions)) {
      appendParam(url.searchParams, `conditions[${k}]`, v);
    }
  }

  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function findDocument(document_number: string, opts?: { base_uri?: string; fields?: string[]; publication_date?: string; }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-find', window.location.origin);
  url.searchParams.set('document_number', document_number);
  if (opts?.fields && opts.fields.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.publication_date) url.searchParams.set('publication_date', opts.publication_date);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Agencies
export async function agenciesAll(opts?: { fields?: string[]; base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'all');
  if (opts?.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function agenciesFind(idOrSlug: string, opts?: { fields?: string[]; base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'find');
  url.searchParams.set('id', idOrSlug);
  if (opts?.fields?.length) url.searchParams.set('fields', opts.fields.join(','));
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function agenciesSuggestions(term?: string, opts?: { base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-agencies', window.location.origin);
  url.searchParams.set('action', 'suggestions');
  if (term) url.searchParams.set('term', term);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Public Inspection
export async function piCurrent(opts?: { base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'current');
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function piAvailableOn(date: string, opts?: { base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'available_on');
  url.searchParams.set('date', date);
  if (opts?.base_uri) url.searchParams.set('base_uri', opts.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function piSearch(params: { term?: string; per_page?: number; page?: number; order?: string; base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-pi', window.location.origin);
  url.searchParams.set('action', 'search');
  if (params.term) url.searchParams.set('conditions[term]', params.term);
  if (params.per_page) url.searchParams.set('per_page', String(params.per_page));
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.order) url.searchParams.set('order', params.order);
  if (params.base_uri) url.searchParams.set('base_uri', params.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Search Details
export async function getSearchDetails(kind: 'document' | 'public_inspection', args?: { term?: string; base_uri?: string }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-search-details', window.location.origin);
  url.searchParams.set('kind', kind);
  if (args?.term) url.searchParams.set('conditions[term]', args.term);
  if (args?.base_uri) url.searchParams.set('base_uri', args.base_uri);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Suggested Searches
export async function suggestedSearches(): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-suggested-searches', window.location.origin);
  url.searchParams.set('action', 'search');
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

export async function suggestedSearchFind(slug: string): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-suggested-searches', window.location.origin);
  url.searchParams.set('action', 'find');
  url.searchParams.set('slug', slug);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Sections
export async function sectionsSearch(): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-sections', window.location.origin);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}

// Topics
export async function topicsSuggestions(term?: string): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-topics', window.location.origin);
  if (term) url.searchParams.set('term', term);
  const urlStr = url.toString();
  const cached = getCached(urlStr);
  if (cached) return { url: urlStr, payload: cached, status: 200 };
  const res = await fetch(urlStr);
  const payload = await res.json().catch(() => ({}));
  if (res.ok) setCached(urlStr, payload);
  return { url: urlStr, payload, status: res.status };
}


// Facet pages
export async function facetSearch(facet: string, params: { page?: number; per_page?: number; base_uri?: string; conditions?: Record<string, any> }): Promise<SearchResponse> {
  const url = new URL('/api/fr-ts-facet', window.location.origin);
  url.searchParams.set('facet', facet);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.per_page) url.searchParams.set('per_page', String(params.per_page));
  if (params.base_uri) url.searchParams.set('base_uri', params.base_uri);
  if (params.conditions && typeof params.conditions === 'object') {
    for (const [k, v] of Object.entries(params.conditions)) {
      appendParam(url.searchParams, `conditions[${k}]`, v);
    }
  }
  const res = await fetch(url.toString());
  const payload = await res.json().catch(() => ({}));
  return { url: url.toString(), payload, status: res.status };
}
