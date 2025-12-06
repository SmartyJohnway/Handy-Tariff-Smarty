/**
 * 工具函式：將解析結果輸出成 CSV 格式
 * - csvEscape：確保含有特殊字元的欄位（逗號、引號、換行）能正確轉義
 * - toCSV：將物件陣列轉換為 CSV 字串
 */

/**
 * CSV 欄位安全轉義
 * - 若字串包含逗號、引號或換行 → 用雙引號包裹，內部引號轉成兩個引號
 */
export const csvEscape = (v: unknown): string => {
  const s = String(v ?? '');
  return /[ ",\n]/.test(s) ? `"${s.replace( /"/g, '""')}"` : s;
};

/**
 * 將一組資料轉換成 CSV 字串
 * @param rows    資料列，每一列是一個物件
 * @param headers 欄位順序（輸出的 CSV 標頭與欄位順序）
 */
export const toCSV = (rows: Record<string, unknown>[], headers: string[]): string => {
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map((h) => csvEscape((r as any)[h])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
};

