export type RateText = string; // 例如 "ad val. 2.5%", "$0.01/kg", "0%"

export interface ProgramRate {
  code: string;
  rate_text: string;
  status?: 'Eligible' | 'Not Eligible';
  desc?: string;
}

export interface StagedRate {
  year: number;
  rate_text: RateText;
}

export interface InvestigationTag {
  number: string;
  phase?: string;
  type?: 'AD' | 'CVD' | '201' | '337' | 'Other';
  types?: Array<'AD' | 'CVD' | '201' | '337' | 'Other'>;
  title?: string;
  productTitle?: string;
  caseNumbers?: string[];
  countries?: string[];
  url?: string;
}

export interface ExtraDutiesSource {
  name: string;
  url?: string;
  effective?: string;
  action?: string;
  action_title?: string;
}

export interface ExtraDuties {
  s232?: { max_rate_text: RateText | null; source?: ExtraDutiesSource };
  s301?: { max_rate_text: RateText | null; source?: ExtraDutiesSource };
  s232_steel?: { max_rate_text: RateText | null };
  s232_aluminum?: { max_rate_text: RateText | null };
}

export interface RemedyRow {
  case: string;
  company?: string;
  rate_text?: RateText;
  start?: string;
  end?: string | null;
  status?: string;
}

export interface TradeRemedy {
  ad?: RemedyRow[];
  cvd?: RemedyRow[];
}

export interface TradeStat {
  year: number;
  metric: string;
  value: number;
  unit: string;
}

export interface GlobalVars {
  currentYear: string;
  currentMonth: string;
  currentQtr: string;
  tariffDatabaseYear: string;
  tariffDatabaseDate: number | string;
  tradeDataRevDate: number | string;
  digestMonth: string;
  digestYear: string;
  currentFullReportingYear: string;
}

export interface SystemAlert {
  system_alert_id: number;
  title: string;
  description: string;
  system_alert_date: string | number;
  is_active: boolean;
  system_alert_type: number;
}

export interface UnifiedTariff {
  source: "baseline" | "dataweb" | "aggregator";
  year: string;
  hts8: string;
  description?: string;
  base_rate?: RateText;
  programs?: ProgramRate[];
  programs_dataweb?: ProgramRate[];
  staged_rates?: StagedRate[];
  investigations?: InvestigationTag[];
  extra_duties?: ExtraDuties;
  trade_remedy?: TradeRemedy;
  tradeStats?: TradeStat[];
  globalVars?: GlobalVars;
  systemAlerts?: SystemAlert[];
  raw?: unknown;
  raw_globalVars?: unknown;
  raw_systemAlerts?: unknown;
  fetched_at: string;
  effectiveDate?: string;
  endDate?: string;
}
