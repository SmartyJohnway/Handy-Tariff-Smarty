﻿import React from 'react';
import TariffQuery from '@/apps/TariffQuery';
import HtsDatabase from '@/apps/HtsDatabase';
import { MarketTrendsProvider } from '@/context/MarketTrendsContext';
import Section232SearchApp from '@/apps/Section232SearchApp';
import { useSearch } from '@/context/SearchContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ResearchTrailContent from '@/components/ResearchTrailContent';
import App4DataWeb from '@/apps/DataWebValidator';
import { TariffIntelligence } from '@/apps/TariffIntelligence';
import { DataSourceVerifier } from '@/apps/DataSourceVerifier';
import MarketTrendsAdvanced from '@/apps/MarketTrendsAdvanced';
import ChartsToolkitGallery from '@/apps/shadcn_UI_example_chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommodityTranslationTool from '@/apps/CommodityTranslationTool';
import { // 替換為新的圖示
    BrainCircuit, LineChart, FileSearch2, Library, Combine, Landmark, CalendarClock,
    Network, Languages, PieChart, Beaker, ShieldCheck
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import FederalRegisterApp from '@/apps/FederalRegister';
import PublicInspection from '@/apps/PublicInspection';

// Keep type for context compatibility
type Tab = 'intelligence' | 'advanced-trends' | 'query' | 'hts' | 'sources' | 'federal-register' | 'federal-register2' | 'dataweb' | 'verifier' | 'translation' | 'charts';
// 顯示用 Tabs 設定（一般/開發模式）
const NORMAL_TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'intelligence', label: '情報總覽', icon: BrainCircuit },
  { key: 'advanced-trends', label: '進階市場趨勢', icon: LineChart },
  { key: 'federal-register', label: '聯邦公報', icon: Landmark },
  { key: 'federal-register2', label: '聯邦預報', icon: CalendarClock },  
  { key: 'query', label: '關稅查詢', icon: FileSearch2 },
  { key: 'hts', label: 'HTSUS 資料庫', icon: Library },
  { key: 'sources', label: '資料來源與工具', icon: Combine },
];

const DEV_TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'intelligence', label: '首頁', icon: ShieldCheck },
  { key: 'charts', label: 'shadcn 圖表示例', icon: PieChart },
  { key: 'dataweb', label: 'DataWeb 驗證', icon: Network },
  { key: 'translation', label: '貨名翻譯', icon: Languages },
  { key: 'verifier', label: '驗證工具', icon: Beaker },
];

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'intelligence', label: '情報總覽', icon: ShieldCheck },
  { key: 'advanced-trends', label: '進階市場趨勢', icon: LineChart },
  { key: 'federal-register', label: '聯邦公報', icon: Landmark },
  { key: 'federal-register2', label: '聯邦預報', icon: CalendarClock },   
  { key: 'query', label: '關稅查詢', icon: FileSearch2 },
  { key: 'hts', label: 'HTSUS 資料庫', icon: Library },
  { key: 'sources', label: '資料來源與工具', icon: Combine },
  { key: 'dataweb', label: 'DataWeb 驗證', icon: Network },
  { key: 'translation', label: '貨品翻譯', icon: Languages },
  { key: 'charts', label: 'shadcn 圖表示例', icon: PieChart }, 
  { key: 'verifier', label: '驗證工具', icon: Beaker },   
];

function App() {
  const { activeTab, setActiveTab } = useSearch();
  const [devMode, setDevMode] = React.useState(false);
  const [theme, setTheme] = React.useState(() => localStorage.getItem("theme") || "system");
  const [themeName, setThemeName] = React.useState(() => localStorage.getItem("theme_name") || "default");
  const displayedTabs = devMode ? DEV_TABS : NORMAL_TABS;
  const filteredTabs = React.useMemo(() => (displayedTabs || []).filter(t => t.key !== 'federal-register2'), [displayedTabs]);
  // Always expose the new Federal Register page

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // 處理主題色
    root.removeAttribute("data-theme");
    if (themeName !== "default") {
      root.setAttribute("data-theme", themeName);
    }
  }, [theme, themeName]);

  const handleSetTheme = (newTheme: string) => {
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  const handleSetThemeName = (newName: string) => {
    localStorage.setItem("theme_name", newName);
    setThemeName(newName);
    // 當使用者明確選擇一個主題時，我們可能希望將模式重設為非系統模式，以避免混淆
    // If the user is in 'system' mode and picks a theme, we should resolve the mode
    // to either 'light' or 'dark' to avoid ambiguity.
    if (theme === 'system') {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      // Update the theme state, which will be handled by the useEffect hook.
      handleSetTheme(systemTheme);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'intelligence':
        return <TariffIntelligence />;
      case 'advanced-trends':
        return <MarketTrendsAdvanced />;
      case 'query':
        return <TariffQuery />;
      case 'hts':
        return <HtsDatabase />;
      case 'sources':
        return <Section232SearchApp />;
      case 'federal-register':
        return <FederalRegisterApp />;
      case 'federal-register2':
        return <PublicInspection />;        
      case 'dataweb':
        return <App4DataWeb />;
      case 'translation':
        return <CommodityTranslationTool />;
      case 'verifier':
        return <DataSourceVerifier />;
      case 'charts':
        return <ChartsToolkitGallery />;
      default:
        return <TariffIntelligence />;
    }
  };

  return (
    <Dialog>
      <div className="w-full max-w-screen-2xl mx-auto p-4 md:p-8">
                <header className="text-center mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Handy Tariff Smarty - 美國進口關稅資料查詢系統</h1>
              <p className="text-foreground mt-2">Smart HTS Research Tool with Official U.S. Trade Data & Federal Register Integration</p>
              <p className="text-foreground mt-2">智慧關稅代碼導航工具 - 整合美國官方關稅資料庫、貿易統計與聯邦公報</p>
            </div>
            <div className="flex justify-center md:justify-end md:shrink-0">
              <ThemeSwitcher
                theme={theme}
                setTheme={handleSetTheme}
                themeName={themeName}
                setThemeName={handleSetThemeName}
              />
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(value: string) => { const v = value as Tab; setActiveTab(v); if (v === 'intelligence') setDevMode(false); }} className="w-full">
          <div className="w-full pb-2">
            <TabsList className="flex flex-wrap h-auto items-center justify-center -mb-px">
                {displayedTabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key} className="whitespace-nowrap px-4 py-2 text-base">
                    <tab.icon className="mr-2 h-5 w-5" />
                    {tab.label}
                </TabsTrigger>
                ))}
            </TabsList>
          </div>
          <TabsContent value={activeTab} className="mt-6">
              <MarketTrendsProvider>
                {renderContent()}
              </MarketTrendsProvider>
          </TabsContent>
        </Tabs>

        <footer className="text-center mt-12 text-sm  text-foreground">
          <p>Integrating HTS.gov, USITC DataWeb, and Federal Register Implementation With Vibe Coding</p>
          <p className="mt-1">本系統僅供參考，最終解釋請以美國官方公告為準。</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span>Author</span>
            <button onClick={() => { setDevMode(true); setActiveTab('charts'); }} className="cursor-pointer" title="Open Dev Mode">:</button>
            <span>Johnway</span>
            <DialogTrigger asChild>
              <button
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                title="顯示研究軌跡"
              >
                (顯示軌跡)
              </button>
            </DialogTrigger>
          </div>
        </footer>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>研究軌跡</DialogTitle>
          </DialogHeader>
          <ResearchTrailContent />
        </DialogContent>
      </div>
    </Dialog>
  );
}

export default App;
