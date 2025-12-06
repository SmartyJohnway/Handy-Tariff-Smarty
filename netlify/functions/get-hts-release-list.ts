import type { Handler } from "@netlify/functions";

// =============================================================================
// Netlify Function: get-hts-release-list
// -----------------------------------------------------------------------------
// 說明:
//   此函式作為一個代理 (proxy) 和快取層，用於從 USITC HTS API 獲取所有 HTS 版本列表。
//   它會處理原始的 epoch 時間戳，並根據請求中提供的時區參數，將其轉換為人類可讀的日期和時間格式。
//
// 呼叫方式:
//   透過 HTTP GET 請求呼叫此 Netlify 函式端點。
//   例如: /.netlify/functions/get-hts-release-list
//
// 查詢參數 (Query Parameters):
//   - timezone (可選): 指定用於格式化日期和時間的時區。
//     如果未提供，預設為 'UTC'。
//     範例值: 'Asia/Taipei', 'America/New_York', 'Europe/London' 等標準 IANA 時區名稱。
//     範例呼叫:
//       - /.netlify/functions/get-hts-release-list?timezone=Asia/Taipei
//       - /.netlify/functions/get-hts-release-list?timezone=America/New_York
//
// 回傳值:
//   成功時 (HTTP 200 OK):
//     一個 JSON 陣列，包含每個 HTS 版本的詳細資訊。
//     每個版本物件會額外包含 'formattedDate' (MM/DD/YYYY 格式) 和 'formattedTime' (HH:MM:SS 24小時制格式) 欄位，
//     這些欄位已根據請求的時區進行轉換。
//     範例:
//     [
//       {
//         "id": { "timestamp": 1762794053, "date": 1762794053000 },
//         "name": "2025HTSRev28",
//         "description": "2025 HTS Revision 28",
//         "date": "11/10/2025", // 原始字串日期
//         "time": "12:00:53",   // 原始字串時間
//         "title": "Revision 28 (2025)",
//         "creator": "Philip Stone",
//         "status": "current",
//         "target": "11/10/2025",
//         "releaseStartDate": "11/10/2025",
//         "releaseEndDate": null,
//         "mergedRevisions": null,
//         "formattedDate": "11/10/2025", // 根據時區格式化後的日期
//         "formattedTime": "12:00:53"  // 根據時區格式化後的時間
//       },
//       // ... 其他版本
//     ]
//
//   失敗時 (HTTP 502 Bad Gateway):
//     一個 JSON 物件，包含錯誤訊息。
//     範例: { "error": "Failed to fetch from upstream HTS API.", "details": "..." }
//
// 快取:
//   回應會被快取 1 小時 (s-maxage=3600)，並在過期後重新驗證。
// =============================================================================

const RELEASE_LIST_URL = "https://hts.usitc.gov/reststop/releaseList";

export const handler: Handler = async (event) => {
  // 從查詢參數中獲取時區，如果沒有則預設為 'UTC'
  const userTimezone = event.queryStringParameters?.timezone || 'UTC';

  try {
    const response = await fetch(RELEASE_LIST_URL, {
      headers: {
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch release list: ${response.statusText}`);
    }

    const data: any[] = await response.json();

    // 處理每個版本資訊，將時間戳轉換為人類可讀的格式
    const processedData = data.map(item => {
      if (item.id && item.id.date) {
        const dateObj = new Date(item.id.date); // item.id.date 是毫秒時間戳

        // 格式化日期 (例如: 11/10/2025)
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: userTimezone
        }).format(dateObj);

        // 格式化時間 (例如: 12:00:53)
        const formattedTime = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false, // 使用 24 小時制
          timeZone: userTimezone
        }).format(dateObj);

        return {
          ...item,
          formattedDate: formattedDate,
          formattedTime: formattedTime,
          // 可以選擇性地保留原始的 date 和 time 欄位，或者移除
          // 為了清晰，這裡保留原始的，並新增格式化後的
        };
      }
      return item;
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "cache-control": "s-maxage=3600, stale-while-revalidate", // 快取 1 小時
      },
      body: JSON.stringify(processedData),
    };
  } catch (err: any) {
    console.error("get-hts-release-list Error:", err);
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ error: "Failed to fetch from upstream HTS API.", details: err.message }),
    };
  }
};