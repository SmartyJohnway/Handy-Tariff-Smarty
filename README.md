# Handy Tariff Smarty (智慧關稅查詢系統)

本專案是一個基於 Vite + React + TypeScript 的現代化美國進口關稅資料查詢與分析工具，旨在整合 HTSUS 官方資料庫、USITC 貿易統計與聯邦公報 (Federal Register) 的資訊，提供一個智慧、高效的查詢與洞察平台。

## 主要功能

*   **情報總覽**: 整合 HTSUS、貿易統計與聯邦公報的智慧儀表板。
*   **進階市場趨勢**: 提供多商品、多指標的深度市場趨勢分析。
*   **聯邦公報查詢**: 強大的聯邦公報 (Federal Register) 全文與分面搜尋。
*   **HTSUS 資料庫**: 完整的 HTSUS 稅則資料庫瀏覽與查詢。
*   **現代化 UI**: 使用 `shadcn/ui` 和 `Tailwind CSS` 打造的一致性、響應式使用者介面。

## 技術棧 (Tech Stack)

*   **前端**: Vite, React, TypeScript
*   **UI 元件庫**: shadcn/ui
*   **CSS 框架**: Tailwind CSS
*   **後端**: Netlify Functions (TypeScript)
*   **打包工具**: Vite (底層為 esbuild + Rollup)


## 專案結構

```
Handy-Tariff-Smarty/
├── netlify.toml                # Netlify 部署與開發設定檔
├── netlify/
│   └── functions/              # 後端 Serverless Functions 原始碼
├── src/                        # 前端 React 應用程式原始碼
│   ├── apps/                   # 頁面級元件
│   ├── components/             # 可複用的 UI 元件
│   ├── context/                # React Context 狀態管理
│   ├── lib/                    # 前後端共用的輔助函式
│   └── main.tsx                # 應用程式進入點
├── package.json                # 專案依賴與腳本
├── vite.config.ts              # Vite 設定檔
└── tsconfig.json               # TypeScript 設定檔
```

## 依賴項管理 (Dependency Management)

本專案是 Monorepo 的一部分，所有依賴項均由**根目錄**的 `package.json` 透過 `workspaces` 統一管理。

若需安裝或更新依賴項，請務必在**專案的根目錄** 執行 `npm install` 或 `npm ci`。

