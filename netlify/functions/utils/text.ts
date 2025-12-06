/**
 * 工具函式：處理 PDF 擷取文字與日期解析
 * - normalizeText：正規化 PDF 擷取文字（空白、換行、NBSP）
 * - toISODate：將 "Month Day, Year" 轉成 ISO 日期字串
 */

/**
 * 正規化文字：
 * - 將 NBSP (\u00A0) 轉換成一般空白
 * - 將多餘的空白或 tab 合併成單一空白
 * - 將 CR (\r) 換成 LF (\n)
 */
export const normalizeText = (s: string): string =>
  s
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n');

/**
 * 將 "Month Day, Year" 格式的字串轉成 ISO 日期 (YYYY-MM-DD)
 * 例如：("March", "6", "2025") → "2025-03-06"
 *
 * @param monthStr 英文月份（如 "March"）
 * @param dayStr   日（如 "6"）
 * @param yearStr  年（如 "2025"）
 * @returns ISO 日期字串，或 null（若解析失敗）
 */
export const toISODate = (monthStr: string, dayStr: string, yearStr: string): string | null => {
  const d = new Date(`${monthStr} ${dayStr}, ${yearStr} 00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  return iso;
};
