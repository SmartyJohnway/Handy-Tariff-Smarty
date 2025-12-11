import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CompanyRatesModal } from '@/components/intelligence/CompanyRatesModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CollapsibleJson } from '@/components/ui/CollapsibleJson';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, ChevronsUpDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchFrAdapterFind } from '@/hooks/queries/useFrAdapterFindQuery';
import { fetchFrAdapterSearch, type FrAdapterSearchArgs } from '@/hooks/queries/useFrAdapterSearchQuery';
import { useCompanyRatesQuery } from '@/hooks/queries/useCompanyRatesQuery';
import {
  useCompanyRatesVerifierQuery,
  type CompanyRatesVerifierParams,
} from '@/hooks/queries/useCompanyRatesVerifierQuery';
import { fetchBaselineAdapter } from '@/hooks/queries/useBaselineAdapterQuery';

// zh-TW i18n strings（集中管理）
const t = {
  agenciesHelp: "FR 檢索機關（例如 international-trade-administration，或填 all）",
  typeHelp: "文件類型（例如 RULE,NOTICE 或 all）",
  perPageHelp: "每次 FR 回傳筆數上限（數字越大回應體量越大）",
  chunkSizeHelp: "每個 OR 合併查詢的子句數（越大請求數越少）",
  perCountryMinHelp: "公平輪詢保底：每國至少執行的查詢次數",
  fetchCapHelp: "全域 FR 請求上限（避免 30 秒超時）",
  tableCheckCapHelp: "全域 HTML 檢測上限（表格偵測上限）",
  legalTermsHelp: "將附加於預設產生的產品標題/案件號查詢（customTerms 路徑不會強加）。",
  includeCountryLabel: "Include Country in Search（預設構造時將國家名稱加入 AND 條件）",
  includeCountryHelp: "僅對「預設詞組構造」生效；使用自訂詞組 customTerms 時，請在詞組中選擇目標國家或 all。",
  phraseGenTitle: "Phrase Generator（自訂詞組清單）",
  phrasePlaceholder: "例如 Hot-Rolled Steel Products 或 701-TA-405",
  exactLabel: "Exact（加引號）",
  countryPlaceholder: "all 或特定國名（如 China）",
  addTableSignalsHelp: "檢測是否存在公司/稅率表格（HTML）以加分",
  tableCheckModeHelp: "none 不檢測；topN 檢測前 N 筆；all 檢測全部（受上限約束）",
  tableCheckTopNHelp: "topN 模式下要檢測的數量（較小較快）",
  scoreWeightsHelp: "可新增關鍵詞條（terms）與 bonus（has_body_html / has_rate_table）",
  broadcastLabel: "自訂詞組國家缺失時廣播（Broadcast）",
  broadcastHelp: "開啟：若 customTerms 指定國家不在本次 grouped，將套用到所有國家；關閉（建議）：跳過該詞組不廣播。",
  tipsTitle: "提示",
  tip1: "perCountryMin 大於 1 時，建議搭配較小的 chunk_size 或增加每國 terms，才能實際跑到多輪。",
  tip2: "customTerms 指定的國家不在本次 grouped 時，是否廣播到所有國家由「Country Broadcast」決定。"
};
const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface CustomFetchResult {
  payload: any;
  statusText?: string;
  filename?: string;
}

const ResultCard = React.forwardRef<any, { title: string; fetcher?: (url: string, hts: string) => Promise<CustomFetchResult> }>(({
  title,
  fetcher
}, ref) => {
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('Awaiting verification...');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [jsonOutput, setJsonOutput] = useState<any>(null);

  const createFilename = (hts: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${title.toLowerCase().replace(/ /g, '-')}_${hts}_${timestamp}.json`;
  };

  const setContent = (data: any, fetchedUrl?: string, filename?: string) => {
    setJsonOutput(data);
    const jsonString = JSON.stringify(data, null, 2);
    const fileContent = fetchedUrl ? `Fetch URL: ${fetchedUrl}\n\n${jsonString}` : jsonString;
    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    if (filename) {
      setDownloadFilename(filename);
    }
  };

  const runFetch = (url: string, hts: string) => {
    setOutput('Loading...');
    setJsonOutput(null);
    setStatus('');
    setDownloadUrl(null);

    if (fetcher) {
      fetcher(url, hts)
        .then(result => {
          setStatus(result.statusText ?? 'Status: 200 Query cache');
          setContent(result.payload, url, result.filename ?? createFilename(hts));
        })
        .catch(err => {
          setOutput(`Error: ${toErrorMessage(err)}`);
          setJsonOutput(null);
          console.error(`Error fetching ${title}:`, err);
        });
      return;
    }

    fetch(url)
      .then(response => {
        setStatus(`Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          return response.text().then(text => { throw new Error(text || `HTTP error ${response.status}`); });
        }
        return response.json();
      })
      .then(data => {
        setContent(data, url, createFilename(hts));
      })
      .catch(err => {
        setOutput(`Error: ${err.message}`);
        setJsonOutput(null);
        console.error(`Error fetching ${title}:`, err);
      });
  };

  React.useImperativeHandle(ref, () => ({ runFetch }));

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
          <div className="flex w-full cursor-pointer items-center justify-between p-4 border rounded-lg bg-card text-card-foreground">
            <span className="font-semibold text-lg">{title}</span>
            <ChevronsUpDown className="h-4 w-4" />
          </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border-t border-border">
          <div className={`text-sm mb-2 ${status.includes('200') ? 'text-success-foreground' : 'text-destructive'}`}>{status || 'Awaiting verification...'}</div>
          {jsonOutput ? <CollapsibleJson data={jsonOutput} title="Response JSON" /> : <pre className="bg-muted p-3 rounded-md text-xs flex-grow overflow-auto max-h-96">{output}</pre>}
          {downloadUrl && (
            <a href={downloadUrl} download={downloadFilename} className="mt-2 text-sm text-primary hover:underline block">
              Download Data
            </a>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

export function DataSourceVerifier() {
  const [htsInput, setHtsInput] = useState('7306.30.10');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const [frRawQuery, setFrRawQuery] = useState('term=Circular Welded Pipe&q_phrase=Final Results');
  const [frAgencies, setFrAgencies] = useState('international-trade-administration');
  const [frTypes, setFrTypes] = useState('RULE,NOTICE');
  const [frDebug, setFrDebug] = useState(true);
  const [frMode, setFrMode] = useState<'auto' | 'http' | 'ruby'>('auto');
  const [frDocumentNumber, setFrDocumentNumber] = useState('');
  const [frResults, setFrResults] = useState<any>(null);
  const [frFetchUrl, setFrFetchUrl] = useState<string | null>(null);
  const [frDownloadUrl, setFrDownloadUrl] = useState<string | null>(null);
  // secondary: result from find by document number (does not overwrite search result)
  const [frDocResult, setFrDocResult] = useState<any>(null);
  const [frDocFetchUrl, setFrDocFetchUrl] = useState<string | null>(null);
  const [frDocDownloadUrl, setFrDocDownloadUrl] = useState<string | null>(null);
  const [frSelectedDoc, setFrSelectedDoc] = useState<string>('');
  const [frSearchLoading, setFrSearchLoading] = useState(false);
  const [frPrimaryDocLoading, setFrPrimaryDocLoading] = useState(false);
  const [frComparisonDocLoading, setFrComparisonDocLoading] = useState(false);
  const [frPerPage, setFrPerPage] = useState(50);
  const [frFacets, setFrFacets] = useState('agency,type,section,topic,daily,weekly,monthly,quarterly');

  const frLoading = frPrimaryDocLoading || frComparisonDocLoading || frSearchLoading;

  const endpoints = {
    'hts-proxy': React.useRef<{ runFetch: (url: string, hts: string) => void }>(null),
    'dataweb-proxy': React.useRef<{ runFetch: (url: string, hts: string) => void }>(null),
    'baseline-adapter': React.useRef<{ runFetch: (url: string, hts: string) => void }>(null),
    'dataweb-adapter': React.useRef<{ runFetch: (url: string, hts: string) => void }>(null),
  };

  const baselineFetcher = React.useCallback(async (url: string, hts: string) => {
    const target = new URL(url, window.location.origin);
    const yearParam = target.searchParams.get('year') || new Date().getFullYear().toString();
    const searchTerm = target.searchParams.get('search_term') || hts;
    const payload = await queryClient.fetchQuery({
      queryKey: ['baseline-adapter', yearParam, searchTerm],
      queryFn: () => fetchBaselineAdapter(yearParam, searchTerm),
    });
    return {
      payload,
      statusText: 'Status: 200 (Query cache)',
      filename: `baseline-adapter_${searchTerm}_${yearParam}.json`,
    };
  }, [queryClient]);

  const getEndpointUrl = (key: string, hts: string, year: string) => {
    switch (key) {
      case 'hts-proxy': return `/api/hts-proxy?query=${hts}`;
      case 'dataweb-proxy':
        const base = import.meta.env.VITE_DATAWEB_BASE_URL || '';
        const endpoint = `/api/v2/tariff/currentTariffDetails?year=${year}&hts8=${hts}`;
        return `/api/dataweb-proxy?base=${encodeURIComponent(base)}&endpoint=${encodeURIComponent(endpoint)}`;
      case 'baseline-adapter': return `/api/baseline-adapter?year=${year}&search_term=${hts}`;
      case 'dataweb-adapter': return `/api/dataweb-adapter?year=${year}&hts8=${hts}`;
      default: return '';
    }
  };

  const handleVerify = async () => {
    const hts = htsInput.trim().replace(/\./g, '');
    if (!hts) { alert('Please enter an HTS code.'); return; }
    setIsLoading(true);
    const year = new Date().getFullYear().toString();
    Object.entries(endpoints).forEach(([key, ref]) => {
      const url = getEndpointUrl(key, hts, year);
      ref.current?.runFetch(url, hts);
    });
    setTimeout(() => setIsLoading(false), 5000);
  };

  const createFrSnapshotUrl = (url: string, payload: any) => {
    const snapshot = `Fetch URL: ${url}\n\n${JSON.stringify(payload, null, 2)}`;
    return URL.createObjectURL(new Blob([snapshot], { type: 'text/plain' }));
  };

  const runFrFind = async (docnum: string, target: 'primary' | 'comparison') => {
    const trimmed = docnum.trim();
    if (!trimmed) return;
    const setLoading = target === 'primary' ? setFrPrimaryDocLoading : setFrComparisonDocLoading;
    const setResult = target === 'primary' ? setFrResults : setFrDocResult;
    const setFetchUrl = target === 'primary' ? setFrFetchUrl : setFrDocFetchUrl;
    const setDownloadUrl = target === 'primary' ? setFrDownloadUrl : setFrDocDownloadUrl;
    setLoading(true);
    try {
      const { payload, url, adapterMode } = await queryClient.fetchQuery({
        queryKey: ['fr-adapter-find', trimmed],
        queryFn: () => fetchFrAdapterFind(trimmed),
      });
      setFetchUrl(url);
      setResult({ status: '200 OK', data: payload, adapterMode });
      setDownloadUrl(createFrSnapshotUrl(url, payload));
    } catch (err) {
      setResult({ status: 'Fetch Error', data: { error: toErrorMessage(err) } });
      setFetchUrl(null);
      setDownloadUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFrVerify = () => {
    setFrResults(null);
    setFrFetchUrl(null);
    setFrDownloadUrl(null);
    setFrSelectedDoc('');
    setFrDocResult(null);
    setFrDocFetchUrl(null);
    setFrDocDownloadUrl(null);
    const docnum = frDocumentNumber.trim();
    if (docnum) {
      runFrFind(docnum, 'primary');
      return;
    }
    const raw = new URLSearchParams(frRawQuery);
    const term = [raw.get('term') || '', raw.get('q_phrase') || ''].filter(Boolean).join(' ').trim() || undefined;
    const toArr = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    const conditions: Record<string, any> = {};
    if (frAgencies && frAgencies !== 'all') conditions.agencies = toArr(frAgencies);
    if (frTypes && frTypes !== 'all') conditions.type = toArr(frTypes);
    const parsedFacets = frFacets.split(',').map((x) => x.trim()).filter(Boolean);
    const searchArgs: FrAdapterSearchArgs = {
      term,
      conditions,
      per_page: frPerPage,
      facets: parsedFacets,
      debug: frDebug,
    };
    setFrSearchLoading(true);
    queryClient
      .fetchQuery({
        queryKey: ['fr-adapter-search', searchArgs],
        queryFn: () => fetchFrAdapterSearch(searchArgs),
      })
      .then(({ payload, url, adapterMode }) => {
        setFrFetchUrl(url);
        setFrResults({ status: '200 OK', data: payload, adapterMode });
        setFrDownloadUrl(createFrSnapshotUrl(url, payload));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setFrResults({ status: 'Fetch Error', data: { error: message } });
        setFrFetchUrl(null);
        setFrDownloadUrl(null);
      })
      .finally(() => setFrSearchLoading(false));
  }

  const handleOpenIntelligence = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'intelligence');
    if (htsInput) url.searchParams.set('hts', htsInput);
    window.location.href = url.toString();
  };

  const extractDocNumbers = (data: any): string[] => {
    if (!data) return [];
    // Support multiple adapter shapes: ts-document, ts-aggregated, ruby/http
    const list = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.documents?.results)
      ? data.documents.results
      : Array.isArray(data?.documents)
      ? data.documents
      : Array.isArray(data?.processed_output?.documents)
      ? data.processed_output.documents
      : Array.isArray(data?.raw_gem_output?.results)
      ? data.raw_gem_output.results
      : [];
    return list
      .map((d: any) => (d?.document_number || d?.documentNumber || d?.attributes?.document_number))
      .filter((v: any) => typeof v === 'string' && v.trim().length > 0);
  };

  const pickResultDocs = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.documents?.results)) return data.documents.results;
    if (Array.isArray(data?.documents)) return data.documents;
    if (Array.isArray(data?.processed_output?.documents)) return data.processed_output.documents;
    if (Array.isArray(data?.raw_gem_output?.results)) return data.raw_gem_output.results;
    return [];
  };

  const flattenAttributes = (obj: any) => (obj && obj.attributes && typeof obj.attributes === 'object') ? { ...obj, ...obj.attributes } : obj;

  const getDocByNumber = (data: any, docnum: string): any | null => {
    if (!data || !docnum) return null;
    const list = pickResultDocs(data);
    for (const d of list) {
      const m = flattenAttributes(d) || {};
      const dn = m.document_number || m.documentNumber || m.attributes?.document_number;
      if (String(dn) === String(docnum)) return m;
    }
    return null;
  };

  const formatValue = (v: any): React.ReactNode => {
    if (!v && v !== 0) return <span className="text-muted-foreground">—</span>;
    if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
      return <a href={v} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{v}</a>;
    }
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') return <code className="text-[11px] break-all">{JSON.stringify(v)}</code>;
    return String(v);
  };

  const agenciesTextFromDoc = (doc: any): string | undefined => {
    const arr = Array.isArray(doc?.agencies) ? doc.agencies : [];
    if (!arr.length) return undefined;
    return arr
      .map((a: any) => (a?.name || a?.raw_name || ''))
      .filter(Boolean)
      .join(', ');
  };

  const buildComparisonRows = (sDoc: any, fDoc: any): Array<{ k: string; a: any; b: any }> => {
    const list: Array<{ k: string; a: any; b: any }> = [];
    const push = (k: string, a: any, b: any) => list.push({ k, a, b });
    if (!sDoc && !fDoc) return list;
    push('document_number', sDoc?.document_number || sDoc?.documentNumber, fDoc?.document_number || fDoc?.documentNumber);
    push('title', sDoc?.title, fDoc?.title);
    push('type', sDoc?.type || sDoc?.action, fDoc?.type || fDoc?.action);
    push('publication_date', sDoc?.publication_date || sDoc?.date, fDoc?.publication_date || fDoc?.date);
    push('agencies', agenciesTextFromDoc(sDoc), agenciesTextFromDoc(fDoc));
    push('agency_names', sDoc?.agency_names, fDoc?.agency_names);
    push('html_url', sDoc?.html_url || sDoc?.body_html_url, fDoc?.html_url || fDoc?.body_html_url);
    push('body_html_url', sDoc?.body_html_url, fDoc?.body_html_url);
    push('pdf_url', sDoc?.pdf_url, fDoc?.pdf_url);
    push('public_inspection_pdf_url', sDoc?.public_inspection_pdf_url, fDoc?.public_inspection_pdf_url);
    push('abstract', sDoc?.abstract, fDoc?.abstract);
    push('addresses', sDoc?.addresses, fDoc?.addresses);
    push('contact', sDoc?.contact, fDoc?.contact);
    push('comment_url', sDoc?.comment_url, fDoc?.comment_url);
    push('comments_close_on', sDoc?.comments_close_on, fDoc?.comments_close_on);
    push('disposition_notes', sDoc?.disposition_notes, fDoc?.disposition_notes);
    push('action', sDoc?.action, fDoc?.action);
    const sEx = Array.isArray(sDoc?.excerpts) ? sDoc.excerpts : undefined;
    const fEx = Array.isArray(fDoc?.excerpts) ? fDoc.excerpts : undefined;
    push('excerpts', sEx, fEx);
    push('dates', sDoc?.dates, fDoc?.dates);
    push('effective_on', sDoc?.effective_on, fDoc?.effective_on);
    push('start_page', sDoc?.start_page, fDoc?.start_page);
    push('end_page', sDoc?.end_page, fDoc?.end_page);
    push('page_length', sDoc?.page_length, fDoc?.page_length);
    push('volume', sDoc?.volume, fDoc?.volume);
    push('docket_id', sDoc?.docket_id, fDoc?.docket_id);
    push('docket_ids', sDoc?.docket_ids, fDoc?.docket_ids);
    push('dockets', sDoc?.dockets, fDoc?.dockets);
    push('full_text_xml_url', sDoc?.full_text_xml_url, fDoc?.full_text_xml_url);
    push('raw_text_url', sDoc?.raw_text_url, fDoc?.raw_text_url);
    push('json_url', sDoc?.json_url, fDoc?.json_url);
    push('mods_url', sDoc?.mods_url, fDoc?.mods_url);
    push('regulation_id_number_info', sDoc?.regulation_id_number_info, fDoc?.regulation_id_number_info);
    push('regulation_id_numbers', sDoc?.regulation_id_numbers, fDoc?.regulation_id_numbers);
    push('regulations_dot_gov_info', sDoc?.regulations_dot_gov_info, fDoc?.regulations_dot_gov_info);
    push('regulations_dot_gov_url', sDoc?.regulations_dot_gov_url, fDoc?.regulations_dot_gov_url);
    push('further_information', sDoc?.further_information, fDoc?.further_information);
    push('supplementary_information', sDoc?.supplementary_information, fDoc?.supplementary_information);
    push('toc_doc', sDoc?.toc_doc, fDoc?.toc_doc);
    push('toc_subject', sDoc?.toc_subject, fDoc?.toc_subject);
    push('topics', sDoc?.topics, fDoc?.topics);
    push('significant', sDoc?.significant, fDoc?.significant);
    push('signing_date', sDoc?.signing_date, fDoc?.signing_date);
    push('subtype', sDoc?.subtype, fDoc?.subtype);
    push('presidential_document_number', sDoc?.presidential_document_number, fDoc?.presidential_document_number);
    push('proclamation_number', sDoc?.proclamation_number, fDoc?.proclamation_number);
    const sPv = sDoc?.page_views; const fPv = fDoc?.page_views;
    push('page_views.count', sPv?.count, fPv?.count);
    push('page_views.last_updated', sPv?.last_updated, fPv?.last_updated);
    const sCfr = Array.isArray(sDoc?.cfr_references) ? sDoc.cfr_references : undefined;
    const fCfr = Array.isArray(fDoc?.cfr_references) ? fDoc.cfr_references : undefined;
    push('cfr_references', sCfr, fCfr);
    return list;
  };

  const handleFrFindByDoc = (docnum: string) => {
    if (!docnum) return;
    setFrDocResult(null);
    setFrDocFetchUrl(null);
    setFrDocDownloadUrl(null);
    runFrFind(docnum, 'comparison');
  };
  
  const [rfvParams, setRfvParams] = useState({
    agencies: 'international-trade-administration', type: 'RULE,NOTICE', per_page: 50, chunk_size: 5,
    legalTerms: '("Final Results of Administrative Review" OR "Amended Final Results" OR "Final Determination")',
    enableScoring: true, addTableSignals: true, tableCheckMode: 'topN', tableCheckTopN: 5,
    scoreWeights: JSON.stringify({
      terms: [
        { pattern: 'amended final', score: 7, type: 'contains' },
        { pattern: 'final results', score: 6, type: 'contains', and: ['administrative review'] },
        { pattern: 'final determination', score: 5, type: 'contains' }, { pattern: 'preliminary', score: 4, type: 'contains' },
        { pattern: 'initiation', score: 3, type: 'contains' }, { pattern: 'changed circumstances', score: 2, type: 'contains' },
        { pattern: 'sunset review', score: 1, type: 'contains' }
      ],
      bonus: { has_body_html: 0.5, has_rate_table: 1.0 }
    }, null, 2),
    perCountryMin: 1, fetchCap: 12, tableCheckCap: 10, includeCountry: false, countryBroadcast: false
  });
  const [rfvRequest, setRfvRequest] = useState<CompanyRatesVerifierParams | null>(null);
  const rfvQuery = useCompanyRatesVerifierQuery(rfvRequest);
  const rfvLoading = rfvQuery.isFetching;
  const [rfvData, setRfvData] = useState<any>(null);
  const [rfvError, setRfvError] = useState<string | null>(null);
  const [rfvDownloadUrl, setRfvDownloadUrl] = useState<string | null>(null);
  const [swPattern, setSwPattern] = useState('');
  const [swScore, setSwScore] = useState<number>(1);
  const [swType, setSwType] = useState<'contains' | 'regex'>('contains');
  const [swAnd, setSwAnd] = useState('');
  const [ctPhrase, setCtPhrase] = useState('');
  const [ctExact, setCtExact] = useState<boolean>(false);
  const [ctAndFinal, setCtAndFinal] = useState<boolean>(false);
  const [ctCountry, setCtCountry] = useState<string>('all');
  const [customTerms, setCustomTerms] = useState<Array<{ phrase: string; exact?: boolean; andFinal?: boolean; country?: string }>>([]);
  const [crOpen, setCrOpen] = useState(false);
  const [crLoading, setCrLoading] = useState(false);
  const [crError, setCrError] = useState<string | null>(null);
  const [crRows, setCrRows] = useState<any[]>([]);
  const [crCountry, setCrCountry] = useState<string | null>('From FR Verifier');
  const [crDocNumber, setCrDocNumber] = useState<string | null>(null);
  const companyRatesQuery = useCompanyRatesQuery({
    documentNumber: crDocNumber ?? '',
    enabled: Boolean(crDocNumber),
  });

  useEffect(() => {
    if (!crDocNumber) {
      setCrLoading(false);
      return;
    }
    if (companyRatesQuery.isFetching) {
      setCrLoading(true);
      return;
    }
    setCrLoading(false);
    if (companyRatesQuery.error) {
      const message =
        companyRatesQuery.error instanceof Error ? companyRatesQuery.error.message : String(companyRatesQuery.error);
      setCrError(message);
      return;
    }
    const data = companyRatesQuery.data;
    if (!data) return;
    if (data.special_case) {
      setCrError(`Special case: ${data.special_case}. Please check FR directly.`);
      setCrRows([{ company: 'N/A', rate: data.source_url || `https://www.federalregister.gov/d/${crDocNumber}` }]);
      return;
    }
    setCrRows(Array.isArray(data?.rates) ? data.rates : []);
  }, [crDocNumber, companyRatesQuery.data, companyRatesQuery.error, companyRatesQuery.isFetching]);

  const runRatesVerifier = () => {
    setRfvError(null);
    setRfvData(null);
    setRfvDownloadUrl(null);
    const hts = htsInput.trim().replace(/\./g, '');
    if (!hts) {
      setRfvRequest(null);
      setRfvError('Please enter an HTS code.');
      return;
    }
    const params: CompanyRatesVerifierParams = {
      hts_code: hts,
      ...rfvParams,
      customTerms: JSON.stringify(customTerms),
    };
    setRfvRequest(params);
  };

  useEffect(() => {
    if (!rfvRequest) return;
    if (rfvQuery.isFetching) return;
    if (rfvQuery.error) {
      const message = rfvQuery.error instanceof Error ? rfvQuery.error.message : String(rfvQuery.error);
      setRfvError(message);
      return;
    }
    if (!rfvQuery.data) return;
    setRfvData(rfvQuery.data);
    const url = new URL('/api/get-company-rates-verifier', window.location.origin);
    Object.entries(rfvRequest).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const snapshot = `URL: ${url.toString()}\n\n${JSON.stringify(rfvQuery.data, null, 2)}`;
    const blob = new Blob([snapshot], { type: 'text/plain' });
    setRfvDownloadUrl(URL.createObjectURL(blob));
  }, [rfvQuery.data, rfvQuery.error, rfvQuery.isFetching, rfvRequest]);

  const rescoreLocally = () => {
    if (!rfvData) return;
    try {
      const weights = JSON.parse(rfvParams.scoreWeights);
      const terms: any[] = Array.isArray(weights.terms) ? weights.terms : [];
      const bonus = weights.bonus || {};
      const scoreTitle = (title: string) => {
        const t = (title || '').toLowerCase(); let s = 0; const matched: string[] = [];
        for (const term of terms) {
          if (term.type === 'regex') {
            try { const re = new RegExp(term.pattern, 'i'); if (re.test(title)) { s = Math.max(s, term.score); matched.push(`/${term.pattern}/:${term.score}`); } } catch { } // Ignore regex errors
          } else {
            const ok = t.includes(String(term.pattern).toLowerCase()) && (!term.and || term.and.every((a: string) => t.includes(a.toLowerCase())));
            if (ok) { s = Math.max(s, term.score); matched.push(`${term.pattern}:${term.score}`); }
          }
        }
        return { s, matched };
      };
      const selected: Record<string, any> = {}; const candidates: any[] = []; const features = rfvData.features || {};
      for (const [country, docs] of Object.entries(rfvData.raw_documents || {})) {
        let best: any = null;
        for (const d of (docs as any[])) {
          const r = scoreTitle(d.title || ''); let sc = r.s; const f = features?.[country]?.[d.document_number] || {};
          if (bonus.has_body_html && f.has_body_html) sc += bonus.has_body_html;
          if (bonus.has_rate_table && f.has_rate_table) sc += bonus.has_rate_table;
          candidates.push({ country, doc: d, score: sc, matched_rules: r.matched, bonus: { has_body_html_bonus: f.has_body_html ? (bonus.has_body_html || 0) : 0, has_rate_table_bonus: f.has_rate_table ? (bonus.has_rate_table || 0) : 0 } });
          if (!best || sc > best.score || (sc === best.score && new Date(d.publication_date || 0).getTime() > new Date(best.doc.publication_date || 0).getTime())) {
            best = { doc: d, score: sc };
          }
        }
        if (best) selected[country] = { latest: { title: best.doc.title, url: best.doc.html_url, date: best.doc.publication_date, document_number: best.doc.document_number }, score: best.score };
      }
      const countries = Object.keys(rfvData.raw_documents || {}).sort().map(c => ({ country: c, hasCase: !!selected[c], latest: selected[c]?.latest || null }));
      const newData = { ...rfvData, scoring: { ...(rfvData.scoring || {}), selected_per_country: selected, candidates_per_country: candidates }, output: { ...(rfvData.output || {}), countries } };
      setRfvData(newData);
      const snapshot = `LOCAL RESCORE\nParams: ${rfvParams.scoreWeights}\n\n${JSON.stringify(newData, null, 2)}`;
      const blob = new Blob([snapshot], { type: 'text/plain' });
      setRfvDownloadUrl(URL.createObjectURL(blob));
    } catch (e) { alert('Invalid scoreWeights JSON'); }
  };

  const addTermToWeights = () => {
    try {
      const weights = JSON.parse(rfvParams.scoreWeights || '{}');
      if (!Array.isArray(weights.terms)) weights.terms = [];
      const term: any = { pattern: swPattern, score: Number(swScore), type: swType };
      const andList = (swAnd || '').split(',').map(s => s.trim()).filter(Boolean);
      if (andList.length) term.and = andList;
      weights.terms.push(term);
      setRfvParams(p => ({ ...p, scoreWeights: JSON.stringify(weights, null, 2) }));
      setSwPattern(''); setSwScore(1); setSwType('contains'); setSwAnd('');
    } catch { alert('Invalid scoreWeights JSON - cannot add term'); }
  };

  const openCompanyRatesFromVerifier = (docNumber: string, country?: string) => {
    setCrCountry(country || 'From FR Verifier');
    setCrOpen(true);
    setCrError(null);
    setCrRows([]);
    if (!docNumber) {
      setCrDocNumber(null);
      setCrLoading(false);
      setCrError('Missing document number.');
      return;
    }
    setCrDocNumber(docNumber);
    setCrLoading(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Data Source Verifier</h1>
        <Button onClick={handleOpenIntelligence} variant="outline">Open Intelligence</Button>
      </div>

      <Tabs defaultValue="hts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hts">HTS Sources</TabsTrigger>
          <TabsTrigger value="fr">FR Adapter</TabsTrigger>
          <TabsTrigger value="rates">Rates Verifier</TabsTrigger>
        </TabsList>

        <TabsContent value="hts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>HTS Data Source Verification</CardTitle>
              <CardDescription>Verify HTS-related data sources for a given HTS code.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) handleVerify(); }} className="flex items-center gap-2 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="text" value={htsInput} onChange={(e) => setHtsInput(e.target.value)} className="pl-10" placeholder="Enter HTS code..." />
                </div>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Verify HTS Sources'}</Button>
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultCard ref={endpoints['hts-proxy']} title="hts-proxy (Raw)" />
                <ResultCard ref={endpoints['dataweb-proxy']} title="dataweb-proxy (Raw)" />
                <ResultCard ref={endpoints['baseline-adapter']} title="baseline-adapter (Processed)" fetcher={baselineFetcher} />
                <ResultCard ref={endpoints['dataweb-adapter']} title="dataweb-adapter (Processed)" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fr" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>FR Ruby Adapter Verifier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fr-raw-query">Query Parameters (e.g., term=pipe&q_any=steel,aluminum)</Label>
                  <Textarea id="fr-raw-query" value={frRawQuery} onChange={e => setFrRawQuery(e.target.value)} className="mt-1 font-mono text-xs" rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="fr-mode">Mode</Label>
                    <Select value={frMode} onValueChange={(value: 'auto' | 'http' | 'ruby') => setFrMode(value)}>
                      <SelectTrigger id="fr-mode" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="http">HTTP (Fallback)</SelectItem>
                        <SelectItem value="ruby">Ruby</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="fr-doc-number">Document Number (optional)</Label>
                    <Input id="fr-doc-number" type="text" value={frDocumentNumber} onChange={e => setFrDocumentNumber(e.target.value)} placeholder="e.g., 2025-19448" className="mt-1" />
                  </div>
                </div>
                <div><Label htmlFor="fr-agencies">Agencies (comma-separated, or 'all')</Label><Input id="fr-agencies" type="text" value={frAgencies} onChange={e => setFrAgencies(e.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="fr-types">Types (comma-separated, or 'all')</Label><Input id="fr-types" type="text" value={frTypes} onChange={e => setFrTypes(e.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="fr-per-page">每頁筆數 (per_page)</Label><Input id="fr-per-page" type="number" min={1} value={frPerPage} onChange={e => setFrPerPage(Number(e.target.value) || 1)} className="mt-1" /></div>
                <div><Label htmlFor="fr-facets">Facets (逗號分隔)</Label><Input id="fr-facets" type="text" value={frFacets} onChange={e => setFrFacets(e.target.value)} className="mt-1" /><p className="text-xs text-muted-foreground mt-1">將 facets 傳給 fr-ts-search 以取得更豐富的分面資料。</p></div>
                <div className="flex items-center space-x-2"><Checkbox id="fr-debug" checked={frDebug} onCheckedChange={(checked: boolean) => setFrDebug(Boolean(checked))} /><Label htmlFor="fr-debug">Enable Debug Mode</Label></div>
                <div><Button onClick={handleFrVerify} disabled={frLoading}>{frLoading ? 'Verifying...' : 'Verify FR Adapter'}</Button></div>
              </div>
              {frFetchUrl && <div className="mt-4"><p className="text-sm font-medium">Fetch URL:</p><code className="block text-xs bg-muted p-2 rounded-md break-all">{frFetchUrl}</code></div>}
              {frResults && (
                <div className="mt-4">
                  <div className="flex justify-between items-center"><h3 className="text-lg flex items-center gap-3">Response: <span className={`font-mono text-sm ${frResults.status.includes('200') ? 'text-success-foreground' : 'text-destructive'}`}>{frResults.status}</span>{frResults.adapterMode && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground" title="Adapter Mode">{frResults.adapterMode}</span>}</h3>{frDownloadUrl && <a href={frDownloadUrl} download={`fr-adapter-response-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`} className="text-sm text-primary hover:underline">Download Results</a>}</div>
                  {extractDocNumbers(frResults.data).length > 0 && (
                    <div className="mt-3 flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor="fr-selected-doc">Pick a document_number to fetch full record</Label>
                        <Select value={frSelectedDoc} onValueChange={(value: string) => { setFrSelectedDoc(value); if (value) handleFrFindByDoc(value); }}>
                          <SelectTrigger id="fr-selected-doc" className="mt-1"><SelectValue placeholder="Select a document..." /></SelectTrigger>
                          <SelectContent>{extractDocNumbers(frResults.data).map((dn) => <SelectItem key={dn} value={dn}>{dn}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {frSelectedDoc && <Button onClick={() => handleFrFindByDoc(frSelectedDoc)} disabled={frLoading}>Fetch by Document Number</Button>}
                    </div>
                  )}
                  <div className='mt-2'><CollapsibleJson title="FR Adapter Response" data={frResults.data} /></div>
                  {frDocResult && (
                    <div className='mt-4 space-y-2'>
                      <div className='text-sm font-medium'>FR Document by Number</div>
                      {frDocFetchUrl && (<code className='block text-xs bg-muted p-2 rounded-md break-all'>{frDocFetchUrl}</code>)}
                      {frDocDownloadUrl && <a href={frDocDownloadUrl} download={`fr-doc-response-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`} className="text-sm text-primary hover:underline">Download Document</a>}
                      <CollapsibleJson title="FR Find Response" data={frDocResult.data} />
                    </div>
                  )}
                  {(frResults && (frSelectedDoc || extractDocNumbers(frResults.data).length > 0)) && (
                    <div className='mt-6'>
                      <div className='text-sm font-medium mb-2'>Comparison Table (Search vs Find)</div>
                      {(() => {
                        const docnum = frSelectedDoc || extractDocNumbers(frResults.data)[0] || '';
                        const sDoc = getDocByNumber(frResults.data, docnum);
                        const fDocPayload = frDocResult?.data || null;
                        const fDoc = fDocPayload ? (fDocPayload.document ? fDocPayload.document : fDocPayload) : null;
                        const rows = buildComparisonRows(sDoc, fDoc);
                        return (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='w-1/4'>Field</TableHead>
                                <TableHead className='w-3/8'>Search (doc: {docnum || '—'})</TableHead>
                                <TableHead className='w-3/8'>Find (doc: {frDocResult ? (fDoc?.document_number || '—') : '—'})</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map(r => (
                                <TableRow key={r.k}>
                                  <TableCell className='font-medium'>{r.k}</TableCell>
                                  <TableCell>{formatValue(r.a)}</TableCell>
                                  <TableCell>{formatValue(r.b)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Rates from FR Verifier</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="rfv-agencies">Agencies</Label><Input id="rfv-agencies" value={rfvParams.agencies} onChange={e => setRfvParams(p => ({ ...p, agencies: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">{t.agenciesHelp}</p></div>
                <div><Label htmlFor="rfv-type">Type</Label><Input id="rfv-type" value={rfvParams.type} onChange={e => setRfvParams(p => ({ ...p, type: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">{t.typeHelp}</p></div>
                <div><Label htmlFor="rfv-per-page">Per Page</Label><Input id="rfv-per-page" type="number" value={rfvParams.per_page} onChange={e => setRfvParams(p => ({ ...p, per_page: parseInt(e.target.value || '50', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.perPageHelp}</p></div>
                <div><Label htmlFor="rfv-chunk-size">Chunk Size</Label><Input id="rfv-chunk-size" type="number" value={rfvParams.chunk_size} onChange={e => setRfvParams(p => ({ ...p, chunk_size: parseInt(e.target.value || '5', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.chunkSizeHelp}</p></div>
                <div><Label htmlFor="rfv-per-country-min">perCountryMin</Label><Input id="rfv-per-country-min" type="number" value={rfvParams.perCountryMin} onChange={e => setRfvParams(p => ({ ...p, perCountryMin: parseInt(e.target.value || '1', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.perCountryMinHelp}</p></div>
                <div><Label htmlFor="rfv-fetch-cap">fetchCap</Label><Input id="rfv-fetch-cap" type="number" value={rfvParams.fetchCap} onChange={e => setRfvParams(p => ({ ...p, fetchCap: parseInt(e.target.value || '12', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.fetchCapHelp}</p></div>
                <div><Label htmlFor="rfv-table-check-cap">tableCheckCap</Label><Input id="rfv-table-check-cap" type="number" value={rfvParams.tableCheckCap} onChange={e => setRfvParams(p => ({ ...p, tableCheckCap: parseInt(e.target.value || '10', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.tableCheckCapHelp}</p></div>
                <div className="md:col-span-2"><Label htmlFor="rfv-legal-terms">Legal Terms</Label><Input id="rfv-legal-terms" value={rfvParams.legalTerms} onChange={e => setRfvParams(p => ({ ...p, legalTerms: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">{t.legalTermsHelp}</p></div>
                <div className="md:col-span-2 flex items-center space-x-2"><Checkbox id="rfv-include-country" checked={rfvParams.includeCountry} onCheckedChange={(checked: boolean) => setRfvParams(p => ({ ...p, includeCountry: Boolean(checked) }))} /><Label htmlFor="rfv-include-country">{t.includeCountryLabel}</Label><p className="text-xs text-muted-foreground mt-1">{t.includeCountryHelp}</p></div>
                <div className="md:col-span-2 border rounded p-3 bg-card"><div className="font-semibold mb-2">{t.phraseGenTitle}</div><div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end"><div className="md:col-span-2"><Label htmlFor="ct-phrase">Phrase</Label><Input id="ct-phrase" placeholder={t.phrasePlaceholder} value={ctPhrase} onChange={e => setCtPhrase(e.target.value)} /></div><div className="flex items-center space-x-2"><Checkbox id="ct-exact" checked={ctExact} onCheckedChange={(checked: boolean) => setCtExact(Boolean(checked))} /><Label htmlFor="ct-exact">{t.exactLabel}</Label></div><div className="flex items-center space-x-2"><Checkbox id="ct-final" checked={ctAndFinal} onCheckedChange={(checked: boolean) => setCtAndFinal(Boolean(checked))} /><Label htmlFor="ct-final">AND Final Results</Label></div><div><Label htmlFor="ct-country">Country</Label><Input id="ct-country" placeholder={t.countryPlaceholder} value={ctCountry} onChange={e => setCtCountry(e.target.value)} /></div><Button onClick={() => { if (!ctPhrase) return; const newTerm = { phrase: ctPhrase, exact: ctExact, andFinal: ctAndFinal, country: ctCountry || 'all' }; setCustomTerms(prev => [...prev, newTerm]); setCtPhrase(''); }} variant="outline" className="w-full">Add phrase</Button></div>{customTerms.length > 0 ? (<div className="mt-3 space-y-2">{customTerms.map((term, idx) => (<div key={idx} className="flex items-center justify-between border rounded p-2"><div className="text-sm"><span className="font-mono">{term.phrase}</span><span className="ml-2 text-muted-foreground">[{term.exact ? 'exact' : 'loose'}{term.andFinal ? ', +Final' : ''}]</span><span className="ml-2">country: {term.country || 'all'}</span></div><Button variant="destructive" size="sm" onClick={() => setCustomTerms(list => list.filter((_, i) => i !== idx))}>Delete</Button></div>))}</div>) : (<p className="mt-2 text-xs text-muted-foreground">No customTerms set: fall back to default logic (product titles/case numbers with legalTerms/country as needed).</p>)}</div>
                <div className="md:col-span-2 flex items-center space-x-2"><Checkbox id="rfv-country-broadcast" checked={rfvParams.countryBroadcast} onCheckedChange={(checked: boolean) => setRfvParams(p => ({ ...p, countryBroadcast: Boolean(checked) }))} /><Label htmlFor="rfv-country-broadcast">{t.broadcastLabel}</Label><p className="text-xs text-muted-foreground mt-1">{t.broadcastHelp}</p></div>
                <div className="flex items-center space-x-2"><Checkbox id="rfv-enable-scoring" checked={rfvParams.enableScoring} onCheckedChange={(checked: boolean) => setRfvParams(p => ({ ...p, enableScoring: Boolean(checked) }))} /><Label htmlFor="rfv-enable-scoring">Enable Scoring</Label></div>
                <div className="flex items-center space-x-2"><Checkbox id="rfv-add-table-signals" checked={rfvParams.addTableSignals} onCheckedChange={(checked: boolean) => setRfvParams(p => ({ ...p, addTableSignals: Boolean(checked) }))} /><Label htmlFor="rfv-add-table-signals">Add Table Signals</Label><p className="text-xs text-muted-foreground">{t.addTableSignalsHelp}</p></div>
                <div><Label htmlFor="rfv-table-check-mode">Table Check Mode</Label><Select value={rfvParams.tableCheckMode} onValueChange={(value: 'none' | 'topN' | 'all') => setRfvParams(p => ({ ...p, tableCheckMode: value }))}><SelectTrigger id="rfv-table-check-mode" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">none</SelectItem><SelectItem value="topN">topN</SelectItem><SelectItem value="all">all</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground mt-1">{t.tableCheckModeHelp}</p></div>
                <div><Label htmlFor="rfv-table-check-topn">Table Check TopN</Label><Input id="rfv-table-check-topn" type="number" value={rfvParams.tableCheckTopN} onChange={e => setRfvParams(p => ({ ...p, tableCheckTopN: parseInt(e.target.value || '5', 10) }))} /><p className="text-xs text-muted-foreground mt-1">{t.tableCheckTopNHelp}</p></div>
                <div className="md:col-span-2"><Label htmlFor="rfv-score-weights">Score Weights (JSON)</Label><Textarea id="rfv-score-weights" rows={6} className="mt-1 font-mono text-xs" value={rfvParams.scoreWeights} onChange={e => setRfvParams(p => ({ ...p, scoreWeights: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">{t.scoreWeightsHelp}</p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input placeholder="pattern" value={swPattern} onChange={e => setSwPattern(e.target.value)} />
                    <Input placeholder="score" value={swScore} onChange={e => setSwScore(parseInt(e.target.value || '1', 10))} />
                    <Select value={swType} onValueChange={(value: 'contains' | 'regex') => setSwType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contains">contains</SelectItem><SelectItem value="regex">regex</SelectItem></SelectContent></Select>
                    <Input placeholder="AND (comma-separated)" value={swAnd} onChange={e => setSwAnd(e.target.value)} />
                    <Button onClick={addTermToWeights} className="md:col-span-4" variant="outline">Add Term to Weights</Button>
                  </div>
                  <div className="mt-3 border rounded p-2"><div className="text-sm font-medium mb-2">Current Terms</div><div className="space-y-2">{(() => { try { const w = JSON.parse(rfvParams.scoreWeights || '{}'); const terms = Array.isArray(w.terms) ? w.terms : []; if (terms.length === 0) return (<div className="text-xs text-muted-foreground">No terms yet.</div>); const removeAt = (idx: number) => { const w2 = JSON.parse(rfvParams.scoreWeights || '{}'); if (!Array.isArray(w2.terms)) w2.terms = []; w2.terms.splice(idx, 1); setRfvParams(p => ({ ...p, scoreWeights: JSON.stringify(w2, null, 2) })); }; return terms.map((t: any, idx: number) => (<div key={idx} className="flex items-center justify-between text-xs bg-muted/80 rounded p-2"><div className="mr-2 truncate"><span className="font-mono text-muted-foreground">{t.type || 'contains'}</span><span className="mx-1">|</span><span className="font-mono">{String(t.pattern)}</span>{Array.isArray(t.and) && t.and.length > 0 && (<span className="ml-1 text-muted-foreground">and[{t.and.join(', ')}]</span>)}<span className="ml-2 font-semibold">score={t.score}</span></div><Button onClick={() => removeAt(idx)} variant="destructive" size="sm">Delete</Button></div>)); } catch (e) { return (<div className="text-xs text-destructive">Invalid scoreWeights JSON</div>); } })()}</div></div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground bg-muted border border-border rounded p-2"><div className="font-medium mb-1">{t.tipsTitle}</div><ul className="list-disc pl-5 space-y-1"><li>{t.tip1}</li><li>{t.tip2}</li></ul></div>
              <div className="mt-3 flex gap-3">
                <Button onClick={runRatesVerifier} disabled={rfvLoading}>{rfvLoading ? 'Running...' : 'Run'}</Button>
                <Button onClick={rescoreLocally} disabled={!rfvData} variant="secondary">Re-score Locally</Button>
                {rfvDownloadUrl && (<Button asChild variant="outline"><a href={rfvDownloadUrl} download={`fr-rates-verifier-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`}>Save Snapshot</a></Button>)}
              </div>
              <div className="mt-4">
                {rfvError && <div className="text-destructive">{rfvError}</div>}
                {rfvData && (
                  <div className="space-y-3">
                    <CollapsibleJson title="Input" data={rfvData.input} />
                    <CollapsibleJson title="Investigations" data={rfvData.investigations} />
                    <CollapsibleJson title="Grouped (by country)" data={rfvData.grouped} />
                    <CollapsibleJson title="Constructed Terms" data={rfvData.constructed_terms} />
                    <CollapsibleJson title="Chunks" data={rfvData.chunks} />
                    <CollapsibleJson title="Fetches" data={rfvData.fetches} />
                    <CollapsibleJson title="Raw Documents" data={rfvData.raw_documents} />
                    <div className="border rounded p-3"><div className="font-semibold mb-2">Quick Test: Open Company Rates</div><div className="space-y-2">{Object.entries(rfvData.raw_documents || {}).map(([country, docs]: any, idx: number) => (<div key={idx}><div className="text-sm font-medium text-foreground mb-1">{country}</div><div className="flex flex-wrap gap-2">{(docs || []).slice(0, 10).map((d: any) => (<Button key={d.document_number} onClick={() => openCompanyRatesFromVerifier(d.document_number, country as string)} size="sm" className="h-auto px-2 py-1 text-xs" title={d.title}>{d.document_number}</Button>))}</div></div>))}</div></div>
                    {rfvData.features && <CollapsibleJson title="Features (table signals)" data={rfvData.features} />}
                    {rfvData.scoring && <CollapsibleJson title="Scoring" data={rfvData.scoring} />}
                    <CollapsibleJson title="Final Output" data={rfvData.output} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <CompanyRatesModal isOpen={crOpen} onClose={() => setCrOpen(false)} country={crCountry} isLoading={crLoading} error={crError} rows={crRows} />
    </div>
  );
}
