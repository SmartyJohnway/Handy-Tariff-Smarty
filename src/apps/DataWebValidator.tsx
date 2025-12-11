import React, { useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { CollapsibleJson } from "../components/ui/CollapsibleJson";
import { Eye, EyeOff } from "lucide-react";

export default function App4DataWeb() {
  const [baseUrl, setBaseUrl] = useState(import.meta.env.VITE_DATAWEB_BASE_URL || '');
  const [authType, setAuthType] = useState<'bearer'|'x-api-key'>('bearer'); // 預設為 bearer
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('dataweb_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [endpoint, setEndpoint] = useState('/api/v2/tariff/currentTariffLookup');
  const [method, setMethod] = useState<'POST'|'GET'>('POST');
  const [body, setBody] = useState<string>(() => JSON.stringify({ searchTerm: '7306.30' }, null, 2));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [responseJson, setResponseJson] = useState<any>(null);
  const [maintMsg, setMaintMsg] = useState<string>('');

  // 檢查是否處於維護期間 (透過 system-alert 端點)
  const checkMaintenance = async () => {
    try {
      const proxy = `/api/dataweb-proxy?base=${encodeURIComponent(baseUrl)}&endpoint=${encodeURIComponent('/api/v2/system-alert')}`;
      const r = await fetch(proxy, { method: 'GET' });
      const txt = await r.text();
      const htmlMaint = /Site under maintenance/i.test(txt) || /<html/i.test(txt) && !txt.trim().startsWith('{') && !txt.trim().startsWith('[');
      if (r.status === 503 || htmlMaint) {
        setMaintMsg('提示：DataWeb 可能正在維護中 (偵測到 503 或 HTML 回應)，POST 請求可能會失敗。');
      } else {
        setMaintMsg('');
      }
    } catch {
      // 忽略檢查失敗，讓使用者仍可嘗試
    }
  };

  React.useEffect(() => { checkMaintenance(); }, [baseUrl]);

  const presets = [
    {
      name: '1. Tariffs: currentTariffLookup',
      endpoint: '/api/v2/tariff/currentTariffLookup',
      method: 'POST',
      body: { searchTerm: '7306.30' },
    },
    {
      name: '1. Tariffs: futureTariffAgreementSingle',
      endpoint: '/api/v2/tariff/futureTariffAgreementSingle',
      method: 'POST',
      body: { countryCode: 'CA', commodityId: '7306.30' },
    },
    {
      name: '1. Tariffs: currentTariffYear',
      endpoint: '/api/v2/tariff/currentTariffYear',
      method: 'GET',
      body: undefined,
    },
    {
      name: '1. Tariffs: currentTariffDetails',
      endpoint: '/api/v2/tariff/currentTariffDetails?year=2024&hts8=73063010',
      method: 'GET',
      body: undefined,
    },
    {
      name: '2. System Alerts: get',
      endpoint: '/api/v2/system-alert',
      method: 'GET',
      body: undefined,
    },
    {
      name: '3. Saved Queries: getAll',
      endpoint: '/api/v2/savedQuery/getAllSavedQueries',
      method: 'GET',
      body: undefined,
    },
    {
      name: '4. Run Query: runReport',
      endpoint: '/api/v2/report2/runReport',
      method: 'POST',
      body: {
        "savedQueryName": "", "savedQueryDesc": "", "isOwner": true, "runMonthly": false,
        "reportOptions": { "tradeType": "Import", "classificationSystem": "HTS" },
        "searchOptions": {
          "MiscGroup": { "districts": { "districtsSelectType": "all" }, "importPrograms": { "programsSelectType": "all" }, "extImportPrograms": { "programsSelectType": "all" }, "provisionCodes": { "provisionCodesSelectType": "all" } },
          "commodities": { "aggregation": "Aggregate Commodities", "codeDisplayFormat": "YES", "commodities": ["730630"], "commoditiesExpanded": [], "commoditiesManual": "", "commodityGroups": { "systemGroups": [], "userGroups": [] }, "commoditySelectType": "list", "granularity": "10", "groupGranularity": null, "searchGranularity": null },
          "componentSettings": { "dataToReport": ["CONS_FIR_UNIT_QUANT"], "scale": "1", "timeframeSelectType": "fullYears", "years": ["2023", "2024"], "startDate": null, "endDate": null, "startMonth": null, "endMonth": null, "yearsTimeline": "Annual" },
          "countries": { "aggregation": "Aggregate Countries", "countries": [], "countriesExpanded": [{ "name": "All Countries", "value": "all" }], "countriesSelectType": "all", "countryGroups": { "systemGroups": [], "userGroups": [] } }
        },
        "sortingAndDataFormat": { "DataSort": { "columnOrder": [], "fullColumnOrder": [], "sortOrder": [] }, "reportCustomizations": { "exportCombineTables": false, "showAllSubtotal": true, "totalRecords": "20000", "exportRawData": false } }
      }
    },
    { name: '5. Query Info: getGlobalVars', endpoint: '/api/v2/query/getGlobalVars', method: 'GET', body: undefined },
    { name: '6. Notifications: getPreferences', endpoint: '/api/v2/notification/notification-preferences', method: 'GET', body: undefined },
    { name: '7. Commodities: validateSearch', endpoint: '/api/v2/commodity/validateCommoditySearch', method: 'POST', body: { tradeType: "Import", classificationSystem: "HTS", search: "7306.30" } },
    { name: '8. Programs: getForHTS', endpoint: "/api/v2/program/programs?hts8=73063010", method: "GET", body: undefined },
    { name: '9. Districts: getAll', endpoint: '/api/v2/district/getAllDistricts', method: 'GET', body: undefined },
    { name: "10. Countries: getAll", endpoint: "/api/v2/country/getAllCountries", method: "GET", body: undefined },
  ] as const;

  const applyPreset = (indexStr: string) => {
    const i = parseInt(indexStr, 10);
    if (isNaN(i) || i < 0 || i >= presets.length) return;
    const p = presets[i];
    setEndpoint(p.endpoint);
    setMethod(p.method as any);
    setBody(p.body ? JSON.stringify(p.body, null, 2) : '');
  };

  const run = async () => {
    setLoading(true); setStatus(''); setResponse(''); setResponseJson(null);
    try {
      localStorage.setItem('dataweb_api_key', apiKey);
      const proxy = `/api/dataweb-proxy?base=${encodeURIComponent(baseUrl)}&endpoint=${encodeURIComponent(endpoint)}`;
      const headers: Record<string,string> = { 'content-type': 'application/json' };
      if (apiKey.trim()) {
        if (authType === 'bearer') headers['x-dw-auth'] = `Bearer ${apiKey.trim()}`;
        else headers['x-dw-key'] = apiKey.trim();
      }
      const init: RequestInit = { method };
      if (method === 'POST' && body) init.body = body;
      init.headers = headers;
      const r = await fetch(proxy, init);
      setStatus(`${r.status} ${r.statusText}`);
      const txt = await r.text();
      const maybeHtml = r.headers.get('content-type')?.includes('text/html') || (/<html/i.test(txt) && !txt.trim().startsWith('{') && !txt.trim().startsWith('['));
      if (maybeHtml) {
        setResponse(`[偵測到 HTML 回應，可能為 DataWeb 維護頁面]\n\n${txt}`);
      } else {
        try {
          const json = JSON.parse(txt);
          setResponseJson(json);
          setResponse(''); // Clear raw text response if JSON is valid
        } catch {
          setResponse(txt); // Fallback to raw text if not JSON
        }
      }
    } catch (e: any) {
      setStatus('ERROR'); setResponse(e?.message || String(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DataWeb API 驗證器</CardTitle>
          <CardDescription>手動測試 USITC DataWeb API 端點。</CardDescription>
        </CardHeader>
      </Card>

      {maintMsg && (
        <div className="text-sm text-warning-foreground bg-warning/10 border border-warning/20 rounded-lg p-3">
          {maintMsg}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">連線設定</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="dwv-base-url">Base URL</Label>
            <Input id="dwv-base-url" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>授權類型 + 金鑰</Label>
            <div className="flex gap-2">
              <Select value={authType} onValueChange={(value: 'bearer' | 'x-api-key') => setAuthType(value)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="bearer">Authorization: Bearer</SelectItem>
                      <SelectItem value="x-api-key">X-Api-Key (可能不支援)</SelectItem>
                  </SelectContent>
              </Select>
              <div className="relative flex-grow">
                <Input
                  className="pr-10"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="請輸入 DataWeb API 金鑰"
                  value={apiKey}
                  onChange={e=>setApiKey(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => setShowApiKey(p => !p)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {authType === 'bearer' ? '建議使用 Bearer (JWT) 作為 Tariff 憑證類型。' : 'X-Api-Key 可能不被所有 Tariff 端點支援。'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">請求內容</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>預設集</Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger><SelectValue placeholder="選擇一個預設請求..." /></SelectTrigger>
              <SelectContent>
                {presets.map((p, i)=>(
                  <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
            <div className="space-y-1">
              <Label htmlFor="dwv-endpoint">Endpoint</Label>
              <Input id="dwv-endpoint" value={endpoint} onChange={e=>setEndpoint(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dwv-method">Method</Label>
              <Select value={method} onValueChange={(value: 'POST' | 'GET') => setMethod(value)}>
                <SelectTrigger id="dwv-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {method === 'POST' && (
            <div className="space-y-1">
              <Label htmlFor="dwv-body">JSON Body</Label>
              <Textarea id="dwv-body" className="h-40 font-mono text-xs" value={body} onChange={e=>setBody(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 border-t pt-6">
        <Button onClick={run} disabled={loading || (!!maintMsg && method==='POST')} size="lg">
            {loading? '執行中...':((!!maintMsg && method==='POST')? '維護中，暫停 POST':'執行請求')}
        </Button>
        <Button asChild variant="outline" size="lg">
            <a href="https://datawebws.usitc.gov/dataweb/swagger-ui/index.html#/" target="_blank" rel="noreferrer">查看官方 Swagger</a>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">請求結果</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>狀態</Label>
            <div className="text-sm text-muted-foreground mt-1 break-all border rounded-md px-3 py-2 bg-muted/50">{status || '尚未發送請求'}</div>
          </div>
          <div>
            <Label>回應</Label>
            <div className="mt-1 border rounded-md p-3 text-sm max-h-[600px] overflow-auto bg-muted/50">
              {responseJson ? (
                <CollapsibleJson title="JSON 回應" data={responseJson} />
              ) : (
                <pre className="whitespace-pre-wrap break-words">{response || '無回應內容'}</pre>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}