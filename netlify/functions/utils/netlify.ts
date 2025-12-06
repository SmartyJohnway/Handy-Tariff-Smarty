import type { HandlerEvent } from "@netlify/functions";

/**
 * 取得當前函式執行環境可用的 Functions Base URL。
 * 在本機 `netlify dev` 與正式環境都可以穩定指向 `/.netlify/functions`.
 * 若後續有自訂 /api 代理，這邊也可視路徑自動 fallback。
 */
export const getFunctionsBaseUrl = (event: HandlerEvent): string => {
  const requestUrl = new URL(event.rawUrl);
  const pathname = requestUrl.pathname || "";
  const basePath = pathname.includes("/.netlify/functions/") ? "/.netlify/functions" : "/api";
  return `${requestUrl.origin}${basePath}`;
};
