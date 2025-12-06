import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// App 1: 來源入口與多來源搜尋面板的資料定義
type Source = {
  id: string;
  label: string;
  home: string;
  buildDirect?: (q: string) => string;
  buildSite?: (q: string) => string;
  desc?: string;
};

const SOURCES: Source[] = [
  {
    id: "usitc_hts",
    label: "USITC · HTSUS",
    home: "https://hts.usitc.gov/",
    buildDirect: (q: string) => `https://hts.usitc.gov/?query=${encodeURIComponent(q)}`,
    buildSite: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:hts.usitc.gov ${q}`)}`,
  },
  {
    id: "bis_232",
    label: "BIS · Section 232",
    home: "https://www.bis.gov/",
    buildSite: (q: string) => {
      const t = (q || '').trim();
      const query = `(site:bis.gov OR site:bis.doc.gov) ("Section 232" OR Proclamation OR Inclusions OR Exclusions) ${t}`.trim();
      return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: "federal_register",
    label: "Federal Register",
    home: "https://www.federalregister.gov/",
    buildDirect: (q: string) => `https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=${encodeURIComponent(q)}%20Section%20232`,
  },
  {
    id: "regulations",
    label: "Regulations.gov (dockets)",
    home: "https://www.regulations.gov/",
    buildDirect: (q: string) => `https://www.regulations.gov/search?filter=${encodeURIComponent(q + " Section 232")}`,
  },
  {
    id: "quantgov",
    label: "QuantGov · Tariff Explorer",
    home: "https://www.quantgov.org/",
    buildDirect: () => `https://www.quantgov.org/tariffs`,
  },
];

// App 3：API/CSV 端點清單
const API_SOURCES = [
  {
    id: "hts_api",
    label: "USITC HTS REST API",
    docs: "https://hts.usitc.gov/",
    build: (q: string) => [
      { name: "search", url: `https://hts.usitc.gov/reststop/search?keyword=${encodeURIComponent(q||'copper')}` },
      { name: "exportList (JSON)", url: `https://hts.usitc.gov/reststop/exportList?from=0100&to=0200&format=JSON&styles=false` },
    ],
  },
  {
    id: "fr_api",
    label: "Federal Register API",
    docs: "https://www.federalregister.gov/developers/api/v1",
    build: (q: string) => [ { name: "documents.json", url: `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${encodeURIComponent(q||'Section 232')}` } ],
  },
  {
    id: "regs_api",
    label: "Regulations.gov v4",
    docs: "https://open.gsa.gov/api/regulationsgov/",
    build: (q: string) => [ { name: "documents (BIS, Section 232)", url: `https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=${encodeURIComponent(q||'Section 232')}&filter%5Bagency%5D=BIS&page%5Bsize%5D=250` } ],
  },
  {
    id: "dataweb",
    label: "USITC DataWeb API",
    docs: "https://dataweb.usitc.gov/",
    build: () => [ { name: "DataWeb Portal", url: "https://dataweb.usitc.gov/" } ],
  },
];

function SourceCard({ src, keyword }: { src: Source; keyword: string }) {
  const directUrl = src.buildDirect ? src.buildDirect(keyword) : null;
  const siteUrl = src.buildSite ? src.buildSite(keyword) : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{src.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={src.home} target="_blank" rel="noreferrer">官方首頁 <ExternalLink className="w-3 h-3 ml-1.5" /></a>
        </Button>
        {directUrl && <Button variant="outline" size="sm" asChild>
          <a href={directUrl} target="_blank" rel="noreferrer">站內搜尋 <ExternalLink className="w-3 h-3 ml-1.5" /></a>
        </Button>}
        {siteUrl && <Button variant="outline" size="sm" asChild>
          <a href={siteUrl} target="_blank" rel="noreferrer">Google site: <ExternalLink className="w-3 h-3 ml-1.5" /></a>
        </Button>}
      </CardContent>
    </Card>
  );
}

function buildSearchMatrix(q: string) {
  const enc = encodeURIComponent;
  const bisQuery = `(site:bis.gov OR site:bis.doc.gov) ("Section 232" OR Proclamation OR Inclusions OR Exclusions) ${q}`.trim();
  return [
    { group: "官方來源", items: [
      { label: "USITC HTSUS 站內搜尋", url: `https://hts.usitc.gov/?query=${enc(q)}`, hint: "官方 HTS 檢索" },
      { label: "HTSUS site: 支援", url: `https://www.google.com/search?q=${enc(`site:hts.usitc.gov ${q}`)}`, hint: "使用 Google 的 USITC 索引" },
      { label: "Federal Register 檢索", url: `https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=${enc(q + " Section 232")}`, hint: "Proclamations/Annex/規則" },
      { label: "Regulations.gov 檢索", url: `https://www.regulations.gov/search?filter=${enc(q + " Section 232")}`, hint: "Docket 與意見" },
    ]},
    { group: "CBP 實務", items: [
      { label: "CBP Trade Remedies（site:）", url: `https://www.google.com/search?q=${enc(`site:cbp.gov "Trade Remedies" ${q}`)}`, hint: "措施/適用清單" },
      { label: "CBP CSMS（site:）", url: `https://www.google.com/search?q=${enc(`site:cbp.gov CSMS ${q}`)}`, hint: "CSMS 訊息" },
    ]},
    { group: "情資彙整/視覺化", items: [
      { label: "BIS 站內（site:）", url: `https://www.google.com/search?q=${enc(bisQuery)}` , hint: "BIS 主題 / Inclusions/Exclusions" },
      { label: "QuantGov（Tariff Explorer）", url: `https://www.quantgov.org/tariffs`, hint: "視覺化資料" },
    ]},
  ];
}

function App2() {
  const [q, setQ] = useState("");
  const matrix = useMemo(() => buildSearchMatrix(q.trim()), [q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>多來源搜尋面板</CardTitle>
        <CardDescription>輸入一次關鍵字（HTS 10 碼、產品名稱、國別或 Chapter 99 代碼），系統會產生對應來源連結。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-6">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="例如：ERW steel pipe、9903.81.90、copper tube" />
          <Button variant="outline" onClick={() => setQ("")}>清除</Button>
        </div>
        <div className="space-y-5">
          {matrix.map((grp) => (
            <Card key={grp.group}>
              <CardHeader>
                <CardTitle className="text-base">{grp.group}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grp.items.map((it) => (
                  <a key={it.label} href={it.url} target="_blank" rel="noreferrer" className="group rounded-xl border p-4 hover:bg-muted flex flex-col gap-1">
                    <div className="font-medium text-sm">{it.label}</div>
                    <div className="text-xs text-muted-foreground">{it.hint}</div>
                    <div className="text-[11px] text-muted-foreground/80 break-all opacity-0 group-hover:opacity-100 transition">{it.url}</div>
                  </a>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Section232SearchApp() {
  const [keyword, setKeyword] = useState("");
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Section 232 綜合情報工具</h1>
      <Tabs defaultValue="app1" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="app1">來源入口</TabsTrigger>
          <TabsTrigger value="app2">多來源搜尋</TabsTrigger>
          <TabsTrigger value="app3">API 端點</TabsTrigger>
          <TabsTrigger value="app5_6">其他資源</TabsTrigger>
        </TabsList>
        
        <TabsContent value="app1" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>來源入口</CardTitle>
              <CardDescription>集中列出常用官方來源。可在下方輸入關鍵字，使用「站內搜尋」或「Google site:」。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="輸入一次關鍵字，供各卡片使用" />
                <Button variant="outline" onClick={() => setKeyword("")}>清除</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOURCES.map((s) => (<SourceCard key={s.id} src={s} keyword={keyword} />))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app2" className="mt-4">
          <App2 />
        </TabsContent>

        <TabsContent value="app3" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>API/CSV 端點</CardTitle>
              <CardDescription>常用 API 與資料端點清單。部分 URL 會使用「來源入口」分頁的關鍵字。</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              {API_SOURCES.map((src) => (
                <Card key={src.id} className="overflow-hidden">
                  <CardHeader className="flex-row items-center gap-2">
                    <CardTitle className="text-base flex-grow">{src.label}</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <a href={src.docs} target="_blank" rel="noreferrer">文件/首頁 <ExternalLink className="w-3 h-3 ml-1.5" /></a>
                    </Button>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {src.build((keyword||'').trim()).map(({name, url}: any) => (
                      <div key={name} className="rounded-lg border p-3 text-sm">
                        <div className="font-semibold">{name}</div>
                        <div className="text-xs text-muted-foreground break-all mt-1">{url}</div>
                        <div className="mt-2 flex gap-2">
                          <Button variant="secondary" size="sm" asChild>
                            <a href={url} target="_blank" rel="noreferrer">開啟</a>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={()=>navigator.clipboard.writeText(url)}>複製</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app5_6" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>貿易統計面板（DataWeb）</CardTitle>
                <CardDescription>USITC DataWeb 需要帳號與 Token。此處提供入口連結以便後續擴充儀表板。</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="https://dataweb.usitc.gov/" target="_blank" rel="noreferrer">DataWeb Portal <ExternalLink className="w-3 h-3 ml-1.5" /></a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>重要公告/專區</CardTitle>
                <CardDescription>彙整常用公告專區快速入口（可再擴充自動化彙整）。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" asChild><a href="https://www.bis.doc.gov/index.php/232-steel" target="_blank" rel="noreferrer">BIS · 232 鋼</a></Button>
                <Button variant="outline" asChild><a href="https://www.bis.doc.gov/index.php/232-aluminum" target="_blank" rel="noreferrer">BIS · 232 鋁</a></Button>
                <Button variant="outline" asChild><a href="https://www.federalregister.gov/" target="_blank" rel="noreferrer">Federal Register</a></Button>
                <Button variant="outline" asChild><a href="https://www.cbp.gov/newsroom/csms" target="_blank" rel="noreferrer">CBP · CSMS</a></Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}