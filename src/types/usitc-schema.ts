
// Corresponds to the root of https://ids.usitc.gov/investigations.json
export interface USITCResponse {
  count: number;
  date: string; // "MM-DD-YYYY"
  data: InvestigationItem[];
}

// Corresponds to each item in the `data` array
export interface InvestigationItem {
  investigation_id: number;
  official_investigation_number?: string;
  investigation_phase_id?: number;
  phase_title?: string;
  phase_long_title?: string;
  investigation_type_id?: number;
  investigation_type_name?: string;
  case_action_id?: number;
  case_action_name?: string;
  investigation_status_id?: number;
  investigation_status_name?: string;
  investigation_title?: string;
  product_name?: string;
  short_product_name?: string;
  countries?: Country[];
  case_officers?: CaseOfficer[];
  investigation_diary?: InvestigationDiaryEntry[];
  public_reports?: PublicReport[];
  federal_register_notices?: FederalRegisterNotice[];
}

export interface Country {
  country_id: number;
  country_name: string;
}

// Note: This appears to be a mix of case managers and staff
export interface CaseOfficer {
  staff_id: number;
  staff_first_name?: string;
  staff_last_name?: string;
  staff_department_id?: number; // Added based on observation
  staff_role_id?: number;
  staff_role_name?: string; // e.g., "Case Manager", "Investigator"
}

// Handles both string date "MM-DD-YYYY" and object {date, isNa}
export type DateField = string | { date: string; isNa: boolean };

export interface InvestigationDiaryEntry {
  diary_id: number;
  diary_type_id: number;
  diary_type_name: string;
  diary_date: DateField;
  diary_action_date?: DateField;
  is_postponed?: boolean;
}

export interface PublicReport {
  report_id: number;
  report_type_id: number;
  report_type_name: string;
  report_title: string;
  publication_number: string;
  publication_date: DateField;
}

export interface FederalRegisterNotice {
  fr_citation_id: number;
  fr_citation_title?: string;
  fr_date: DateField;
  fr_page_number?: number;
  fr_url: string;
}

// --- Flattened & Normalized Schema for Frontend Use ---

export interface FlatInvestigation {
  id: number; // investigation_id
  officialId?: string; // official_investigation_number
  legacyId?: string; // Investigation Number (legacy format)
  subNumbers?: string[]; // Sub-investigation numbers (if any)
  commerceOrders?: { orderNumber?: string }[];
  topic?: string;
  phase: string;
  type: string;
  action: string;
  status: string;
  title: string;
  product: string;
  startDate?: string;
  endDate?: string;
  countries: string[];
  caseManagers: string[];
  investigators: string[];
  analysts: string[];
  diary: FlatDiaryEntry[];
}

export interface FlatDiaryEntry {
  type: string;
  date: string; // YYYY-MM-DD
  isPostponed: boolean;
}

// --- Helper Function ---

/**
 * Normalizes a raw date field from the API into a 'YYYY-MM-DD' string.
 * Handles both "MM-DD-YYYY" strings and { date: "MM-DD-YYYY", isNa: boolean } objects.
 * Returns an empty string if the date is invalid or missing.
 */
function normalizeDate(dateField: DateField | undefined | null): string {
  if (!dateField) return "";

  const dateStr = typeof dateField === "string" ? dateField : dateField.date;
  if (!dateStr || dateStr.length !== 10) return ""; // Basic validation for "MM-DD-YYYY"

  const [month, day, year] = dateStr.split("-");
  if (!month || !day || !year) return "";

  return `${year}-${month}-${day}`;
}

/**
 * Transforms a raw, nested InvestigationItem from the USITC API
 * into a flattened, more usable structure for frontend applications.
 */
export function normalizeInvestigation(
  raw: InvestigationItem
): FlatInvestigation {
  // Helper to fetch string fields from multiple possible keys (handles legacy snake_case and current title-case JSON)
  const pickString = (obj: any, keys: string[], fallback?: string): string | undefined => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "string" && v.trim()) return v;
      // Also handle object with Name field
      if (typeof v === "object" && v !== null && typeof v.Name === "string" && v.Name.trim()) {
        return v.Name;
      }
    }
    return fallback;
  };

  // Helper to extract date from multiple possible keys and normalize to YYYY-MM-DD
  const pickDate = (obj: any, keys: string[]): string => {
    for (const k of keys) {
      const v = obj?.[k];
      const normalized = normalizeDate(v as DateField);
      if (normalized) return normalized;
    }
    return "";
  };

  // --- ID & Official Number ---
  const id =
    (raw as any).investigation_id ??
    (raw as any)["Investigation ID"] ??
    (raw as any).case_id ??
    (raw as any)["Case ID"];

  const officialId =
    pickString(raw, ["official_investigation_number", "Investigation Number"]) ??
    (typeof (raw as any).investigation_id === "number"
      ? String((raw as any).investigation_id)
      : undefined);
  const legacyId = pickString(raw, ["Investigation Number"]);
  const subInvs =
    ((raw as any)["Sub-investigation"] as any[]) ??
    ((raw as any)["Sub-Investigation"] as any[]);
  const subNumbers =
    subInvs
      ?.map((s) => {
        if (typeof s === "string") return s;
        return s?.["Investigation Number"] || s?.investigation_number;
      })
      .filter(Boolean) || [];
  const commerceOrders =
    ((raw as any)["Commerce Orders"] as any[])?.map((o) => ({
      orderNumber: o?.["Commerce Order/Case Number"],
    })) || [];

  // --- Titles / Topic / Product ---
  const title =
    pickString(raw, ["investigation_title", "Full Title", "Topic"], "No Title")!;
  const topic = pickString(raw, ["Topic", "investigation_title", "Full Title"]);
  const hts = (raw as any)["HTS Number & Description"];
  const htsDesc =
    typeof hts === "object"
      ? hts?.Description ?? hts?.Name
      : undefined;
  const product =
    pickString(raw, ["product_name", "short_product_name"]) ??
    htsDesc ??
    "N/A";

  // --- Phase / Type / Action / Status ---
  const phase =
    pickString(raw, ["phase_long_title", "phase_title", "Investigation Phase"], "N/A")!;
  const type =
    pickString(raw, ["investigation_type_name", "Investigation Type"], "N/A")!;
  const action =
    pickString(raw, ["case_action_name", "Case Action"], "N/A")!;
  const status =
    pickString(raw, ["investigation_status_name", "Investigation Status"], "N/A")!;

  // --- Dates ---
  const startDate = pickDate(raw, ["start_date", "Start Date"]);
  const endDate = pickDate(raw, ["investigation_end_date", "Investigation End Date"]);

  // --- Staff ---
  const staff = raw.case_officers ?? [];

  const caseManagers = staff
    .filter((s) => s.staff_role_name === "Case Manager")
    .map((s) => `${s.staff_first_name} ${s.staff_last_name}`)
    .filter(Boolean);

  const investigators = staff
    .filter((s) => s.staff_role_name === "Investigator")
    .map((s) => `${s.staff_first_name} ${s.staff_last_name}`)
    .filter(Boolean);

  const analysts = staff
    .filter(
      (s) =>
        s.staff_role_name?.includes("Analyst") ||
        s.staff_role_name === "Attorney"
    )
    .map((s) => `${s.staff_first_name} ${s.staff_last_name}`)
    .filter(Boolean);

  const diary: FlatDiaryEntry[] = (raw.investigation_diary ?? [])
    .map((d) => ({
      type: d.diary_type_name,
      date: normalizeDate(d.diary_date),
      isPostponed: d.is_postponed ?? false,
    }))
    .filter((d) => d.date); // Only include entries with a valid date

  return {
    id,
    officialId,
    legacyId,
    subNumbers,
    commerceOrders,
    topic,
    phase,
    type,
    action,
    status,
    title,
    product,
    startDate,
    endDate,
    countries: (() => {
      const countrySource =
        raw.countries ??
        (raw as any).Countries ??
        [];
      return (countrySource as any[])
        .map((c) =>
          typeof c === "string"
            ? c
            : c?.country_name ?? c?.["Country Name"] ?? c?.name
        )
        .filter(Boolean) as string[];
    })(),
    caseManagers,
    investigators,
    analysts,
    diary,
  };
}
