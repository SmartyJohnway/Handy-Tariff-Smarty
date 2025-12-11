// Utilities to normalize Federal Register responses across different adapter modes
// - ts-aggregated: payload.results[] or payload.documents.results[] (possibly with attributes)
// - ts-document:   payload.results[]
// - ts-find:       payload.document

export interface AgencyLite {
  name?: string;
  id?: number;
  slug?: string;
  raw_name?: string;
}

export interface NormalizedFRDoc {
  document_number: string;
  title: string;
  type?: string;
  publication_date?: string;
  html_url?: string;
  body_html_url?: string | null;
  pdf_url?: string | null;
  public_inspection_pdf_url?: string | null;
  agencies?: AgencyLite[];
  agencies_text?: string;
  agency_names?: string[];
  abstract?: string;
  addresses?: string;
  contact?: string;
  comment_url?: string;
  comments_close_on?: string | null;
  disposition_notes?: string;
  excerpts?: string[];
  // pre-expanded optional fields (ts-find richness)
  action?: string;
  dates?: string;
  docket_id?: string;
  docket_ids?: string[];
  dockets?: any[];
  effective_on?: string;
  start_page?: number;
  end_page?: number;
  page_length?: number;
  page_views?: { count?: number; last_updated?: string } | null;
  full_text_xml_url?: string;
  raw_text_url?: string;
  json_url?: string;
  mods_url?: string;
  regulation_id_numbers?: string[];
  regulation_id_number_info?: any;
  regulations_dot_gov_info?: any;
  regulations_dot_gov_url?: string | null;
  further_information?: string;
  supplementary_information?: string;
  significant?: boolean | null;
  signing_date?: string | null;
  subtype?: string | null;
  toc_doc?: string | null;
  toc_subject?: string | null;
  topics?: any[];
  volume?: number | string | null;
  presidential_document_number?: string | number | null;
  proclamation_number?: string | number | null;
  cfr_references?: any[];
  citation?: string;
  correction_of?: any;
  corrections?: any[];
  images?: any;
  images_metadata?: any;
  not_received_for_publication?: any;
  explanation?: any;
  executive_order_notes?: any;
  executive_order_number?: any;
}

function isObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object';
}

function flattenAttributes<T extends Record<string, any>>(obj: T): T {
  if (!isObject(obj)) return obj;
  const attrs = isObject((obj as any).attributes) ? (obj as any).attributes : undefined;
  if (!attrs) return obj;
  // attributes takes precedence on conflicts
  return { ...(obj as any), ...(attrs as any) } as T;
}

function normalizeAgencies(input: any): { agencies?: AgencyLite[]; agencies_text?: string } {
  if (!Array.isArray(input)) return {};
  const agencies: AgencyLite[] = input.map((x) => {
    if (!isObject(x)) return {} as AgencyLite;
    const name = (x as any).name ?? (x as any).raw_name;
    return {
      name,
      id: (x as any).id,
      slug: (x as any).slug,
      raw_name: (x as any).raw_name,
    } as AgencyLite;
  });
  const agencies_text = agencies
    .map((a) => (a?.name || a?.raw_name || ''))
    .filter(Boolean)
    .join(', ');
  return { agencies, agencies_text };
}

function toStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') return v ? [v] : [];
  return [];
}

function extractExcerpts(obj: any): string[] {
  const merged = isObject(obj) ? obj : {};
  const hl = (merged.highlight || merged.highlights || {}) as any;
  const exRaw = merged.excerpts;
  const ex1 = toStringArray(exRaw);
  const ex2 = toStringArray(hl?.excerpts);
  const ex3 = toStringArray(hl?.matches);
  const out = ex1.length ? ex1 : ex2.length ? ex2 : ex3;
  return out.map((x) => String(x));
}

export function normalizeFRDoc(obj: any): NormalizedFRDoc | null {
  if (!obj) return null;
  const merged = flattenAttributes(obj);

  const document_number = String((merged as any).document_number || (merged as any).documentNumber || '');
  const title = String((merged as any).title || (merged as any).name || '');
  const type = (merged as any).type || (merged as any).action;
  const publication_date = (merged as any).publication_date || (merged as any).published_at || (merged as any).date;
  const html_url = (merged as any).html_url || (merged as any).body_html_url || (merged as any).full_text_url;
  const body_html_url = (merged as any).body_html_url ?? null;
  const pdf_url = (merged as any).pdf_url ?? null;
  const public_inspection_pdf_url = (merged as any).public_inspection_pdf_url ?? null;
  const abs = (merged as any).abstract;
  const agency_names = Array.isArray((merged as any).agency_names) ? (merged as any).agency_names.map((x: any) => String(x)) : undefined;
  const { agencies, agencies_text } = normalizeAgencies((merged as any).agencies);
  const excerpts = extractExcerpts(merged);
  const addresses = (merged as any).addresses;
  const contact = (merged as any).contact || (merged as any).contacts;
  const comment_url = (merged as any).comment_url;
  const comments_close_on = (merged as any).comments_close_on ?? null;
  const disposition_notes = (merged as any).disposition_notes;
  const further_information = (merged as any).further_information;
  const supplementary_information = (merged as any).supplementary_information;

  // pre-expanded fields from ts-find
  const action = (merged as any).action;
  const dates = (merged as any).dates;
  const docket_id = (merged as any).docket_id ? String((merged as any).docket_id) : undefined;
  const docket_ids = Array.isArray((merged as any).docket_ids) ? (merged as any).docket_ids.map((x: any) => String(x)) : undefined;
  const dockets = Array.isArray((merged as any).dockets) ? (merged as any).dockets : undefined;
  const effective_on = (merged as any).effective_on;
  const start_page = (merged as any).start_page != null ? Number((merged as any).start_page) : undefined;
  const end_page = (merged as any).end_page != null ? Number((merged as any).end_page) : undefined;
  const page_length = (merged as any).page_length != null ? Number((merged as any).page_length) : undefined;
  const page_views = (merged as any).page_views ?? null;
  const full_text_xml_url = (merged as any).full_text_xml_url;
  const raw_text_url = (merged as any).raw_text_url;
  const json_url = (merged as any).json_url;
  const mods_url = (merged as any).mods_url;
  const regulation_id_numbers = Array.isArray((merged as any).regulation_id_numbers) ? (merged as any).regulation_id_numbers.map((x: any) => String(x)) : undefined;
  const regulation_id_number_info = (merged as any).regulation_id_number_info;
  const regulations_dot_gov_info = (merged as any).regulations_dot_gov_info;
  const regulations_dot_gov_url = (merged as any).regulations_dot_gov_url ?? null;
  const significant = (merged as any).significant ?? null;
  const signing_date = (merged as any).signing_date ?? null;
  const subtype = (merged as any).subtype ?? null;
  const toc_doc = (merged as any).toc_doc ?? null;
  const toc_subject = (merged as any).toc_subject ?? null;
  const topics = Array.isArray((merged as any).topics) ? (merged as any).topics : undefined;
  const volume = (merged as any).volume ?? null;
  const presidential_document_number = (merged as any).presidential_document_number ?? null;
  const proclamation_number = (merged as any).proclamation_number ?? null;
  const cfr_references = Array.isArray((merged as any).cfr_references) ? (merged as any).cfr_references : undefined;
  const citation = (merged as any).citation;
  const correction_of = (merged as any).correction_of;
  const corrections = Array.isArray((merged as any).corrections) ? (merged as any).corrections : undefined;
  const images = (merged as any).images;
  const images_metadata = (merged as any).images_metadata;
  const not_received_for_publication = (merged as any).not_received_for_publication;
  const explanation = (merged as any).explanation;
  const executive_order_notes = (merged as any).executive_order_notes;
  const executive_order_number = (merged as any).executive_order_number;

  return {
    document_number,
    title,
    type,
    publication_date,
    html_url,
    body_html_url,
    pdf_url,
    public_inspection_pdf_url,
    agencies,
    agencies_text,
    agency_names,
    abstract: typeof abs === 'string' ? abs : undefined,
    addresses,
    contact,
    comment_url,
    comments_close_on,
    disposition_notes,
    excerpts,
    action,
    dates,
    docket_id,
    docket_ids,
    dockets,
    effective_on,
    start_page,
    end_page,
    page_length,
    page_views,
    full_text_xml_url,
    raw_text_url,
    json_url,
    mods_url,
    regulation_id_numbers,
    regulation_id_number_info,
    regulations_dot_gov_info,
    regulations_dot_gov_url,
    further_information,
    supplementary_information,
    significant,
    signing_date,
    subtype,
    toc_doc,
    toc_subject,
    topics,
    volume,
    presidential_document_number,
    proclamation_number,
    cfr_references,
    citation,
    correction_of,
    corrections,
    images,
    images_metadata,
    not_received_for_publication,
    explanation,
    executive_order_notes,
    executive_order_number,
  } as NormalizedFRDoc;
}

export function pickResults(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload?.results)) return payload.results as any[];
  if (Array.isArray(payload?.documents?.results)) return payload.documents.results as any[];
  if (Array.isArray(payload?.documents)) return payload.documents as any[];
  return [];
}

export function normalizeResults(payload: any): NormalizedFRDoc[] {
  const arr = pickResults(payload);
  return arr
    .map((d: any) => normalizeFRDoc(d))
    .filter((x): x is NormalizedFRDoc => !!x && !!x.document_number && !!x.title);
}

export function normalizeFind(payload: any): NormalizedFRDoc | null {
  const doc = payload?.document ?? payload;
  return normalizeFRDoc(doc);
}

// UI helper: convert raw excerpt to displayable HTML (keep line breaks and highlight matches)
export function formatExcerpt(s: string): string {
  return String(s || '')
    .replace(/\n/g, '<br/>')
    .replace(/<span\s+class=["']match["']>/gi, '<span style="background-color:#fde68a;padding:0 2px;border-radius:2px;">');
}
