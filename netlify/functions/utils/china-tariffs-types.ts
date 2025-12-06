/**
 * 型別：給 China Tariffs PDF 解析器使用
 * - ParserOptions：近鄰配對法參數（最大距離）
 * - FilenameMeta：從檔名抽出的年份/修訂序
 * - IEEPA*：CN/HK IEEPA 附加稅時間窗與對應 Chapter 99
 * - MappingRow：CSV 每列的結構
 * - MetaJSON：JSON 輸出的結構（版本/時效/IEEPA/9903 生效日/列數）
 */

/** 近鄰配對法選項（字元距離閾值） */
export interface ParserOptions {
  /** HTS8 token 與其後第一個 9903 token 之間允許的最大距離（字元），預設 120 */
  maxDistance?: number;
}

/** 檔名解析結果：China Tariffs_(YYYY)HTSRev(REV).pdf */
export interface FilenameMeta {
  fileYear: string | null;
  fileRevision: string | null;
}

/** IEEPA：2025-03-04(含) 起 20% 之時間窗 */
export interface IEEPAWindowCurrent {
  /** ISO 日期，例如 '2025-03-04' */
  effective_from: string;
  /** 加徵 ad valorem（小數），例如 0.2 代表 20% */
  rate_ad_valorem: number;
  /** 對應 Chapter 99 標頭（固定） */
  chapter99_heading: '9903.01.24';
}

/** IEEPA：2025-02-05 ~ 2025-03-03 期間 10% 之時間窗 */
export interface IEEPAWindowPrevious {
  /** ISO 日期，例如 '2025-02-05' */
  effective_from: string;
  /** ISO 日期，例如 '2025-03-03' */
  effective_to: string;
  /** 加徵 ad valorem（小數），例如 0.1 代表 10% */
  rate_ad_valorem: number;
  /** 對應 Chapter 99 標頭（固定） */
  chapter99_heading: '9903.01.20';
}

/** IEEPA：CN/HK 附加稅資訊（可能同時具備 current 與 previous） */
export interface IEEPAInfo {
  current?: IEEPAWindowCurrent;
  previous?: IEEPAWindowPrevious;
}

/** 解析得到的一筆 HTS8→Chapter 99 對應（CSV 的一列） */
export interface MappingRow {
  /** 例：'7306.30.10' */
  hts8: string;
  /** 無點號版本：'73063010' */
  hts8_nodots: string;
  /** 01–97 章（數字） */
  chapter: number;
  /** 例：'9903.88.15' */
  chapter99_heading: string;

  /** 原始 PDF 檔名（可追溯） */
  source_file: string;
  /** 檔名中的年份（例：'2025'） */
  hts_year_from_name: string | null;
  /** 檔名中的修訂序（例：'24'） */
  hts_revision_from_name: string | null;
  /** 首頁 Last Updated 解析出的 ISO 日期（例：'2025-03-06'） */
  last_updated: string | null;
}

/** JSON 輸出的整體結構（搭配 CSV 使用） */
export interface MetaJSON {
  /** 原始 PDF 檔名 */
  source_file: string;
  /** 檔名中的年份（例：'2025'） */
  file_year: string | null;
  /** 檔名中的修訂序（例：'24'） */
  file_revision: string | null;
  /** 首頁 Last Updated → ISO 日期（例：'2025-03-06'） */
  last_updated_on_pdf: string | null;

  /** IEEPA（CN/HK）附加稅時間窗資訊 */
  ieepa_cn_hk: IEEPAInfo;

  /**
   * 9903.* 標頭生效日對照（key: '9903.xx.xx' → value: ISO 日期 'YYYY-MM-DD'）
   * 來源：PDF 中 "heading 9903.xx.xx became effective on Month D, YYYY" 等敘述
   */
  section301_effective_headings: Record<string, string>;

  /** 本次轉檔時間（ISO datetime） */
  record_generated_at: string;

  /** 解析得到的 HTS8→Chapter 99 對應列數（CSV 總列數） */
  row_count_hts8_to_301: number;

  /** Diagnostics: missing keys, notes, etc. */
  diagnostics?: {
    missing_effective_headings?: string[];
    notes?: string[];
  };
}

/** 方便在程式內表達「一組配對」的 tuple 型別（非必需，但常用） */
export type HtsToCh99Pair = [hts8: string, chapter99_heading: string];
