import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Skeleton } from './ui/skeleton';
import { Loader2, Search } from 'lucide-react';
import type { FlatInvestigation } from '@/types/usitc-schema';
import CaseDashboardRawMapforuser from './CaseDashboardRawMapforuser';
import CaseDashboardRawMapfordev from './CaseDashboardRawMapfordev';

interface SearchResult {
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    sourceDataTimestamp: string | null;
  };
  data: FlatInvestigation[];
  rawData?: any[];
}

const STATUS_OPTIONS = [
  '',
  'Completed',
  'Terminated',
  'Inactive',
  'Active',
  'Pending before the ALJ',
  'Not Instituted',
  'Complaint/Request Withdrawn',
  'Pre-institution',
  'Pending before the Commission',
  'Adequacy',
  'Pending',
  'Cancelled',
  'Petition/Request Withdrawn',
  'Consolidated',
];

export const IDSCard: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [officialId, setOfficialId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRawIdx, setSelectedRawIdx] = useState(0);
  const [submitted, setSubmitted] = useState({
    keyword: '',
    country: '',
    status: '',
    officialId: '',
    orderNumber: '',
  });

  const queryEnabled = useMemo(
    () =>
      !!submitted.keyword ||
      !!submitted.country ||
      !!submitted.status ||
      !!submitted.officialId ||
      !!submitted.orderNumber,
    [submitted]
  );

  const {
    data: searchResult,
    isFetching,
    isError,
    error,
  } = useQuery<SearchResult, Error>({
    queryKey: [
      'ids-card-search',
      submitted.keyword,
      submitted.country,
      submitted.status,
      submitted.officialId,
      submitted.orderNumber,
      page,
      showRaw,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: submitted.keyword,
        country: submitted.country,
        status: submitted.status,
        officialId: submitted.officialId,
        orderNumber: submitted.orderNumber,
        page: page.toString(),
        pageSize: '10',
        includeRaw: '1',
      });
      const res = await fetch(`/api/ids-search?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch IDS data');
      }
      return res.json();
    },
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
  });

  const handleSearch = () => {
    setPage(1);
    setSubmitted({
      keyword: keyword.trim(),
      country: country.trim(),
      status: status.trim(),
      officialId: officialId.trim(),
      orderNumber: orderNumber.trim(),
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    if (searchResult?.rawData && searchResult.rawData.length > 0) {
      setSelectedRawIdx(0);
    }
  }, [searchResult?.rawData]);

  const selectedRaw =
    searchResult?.rawData && searchResult.rawData.length > 0
      ? searchResult.rawData[Math.min(selectedRawIdx, searchResult.rawData.length - 1)]
      : null;

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="text-lg">USITC Investigation Search</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Keyword (topic/product/country)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isFetching}
          />
          <Input
            placeholder="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isFetching}
          />
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isFetching}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt || 'all'} value={opt}>
                {opt || 'All statuses'}
              </option>
            ))}
          </select>
          <Input
            placeholder="Inv. Number (e.g., 701-253)"
            value={officialId}
            onChange={(e) => setOfficialId(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isFetching}
          />
          <Input
            placeholder="Commerce Order/Case Number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isFetching}
          />
        </div>

        <div className="flex justify-end">
          <label className="mr-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
              disabled={isFetching}
            />
            Show raw tree
          </label>
          <Button onClick={handleSearch} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search
          </Button>
        </div>

        <div className="relative min-h-[200px]">
          {isFetching && !searchResult && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}
          {isError && !isFetching && (
            <div className="text-sm text-destructive">
              Failed to load search results. {error?.message}
            </div>
          )}
          {!isFetching && searchResult && searchResult.data.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No results found for current filters.
            </div>
          )}
          {searchResult && searchResult.data.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Showing{' '}
                {searchResult.metadata.totalItems > searchResult.metadata.pageSize
                  ? `${(searchResult.metadata.currentPage - 1) * searchResult.metadata.pageSize + 1}-${Math.min(
                      searchResult.metadata.currentPage * searchResult.metadata.pageSize,
                      searchResult.metadata.totalItems
                    )}`
                  : searchResult.metadata.totalItems}{' '}
                of {searchResult.metadata.totalItems} results.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">Inv. Number</th>
                      <th className="py-2 pr-3">Topic</th>
                      <th className="py-2 pr-3">Phase</th>
                      <th className="py-2 pr-3">Countries</th>
                      <th className="py-2 pr-3">Start Date</th>
                      <th className="py-2 pr-3">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.data.map((item) => (
                      <tr key={item.id} className="border-b last:border-none">
                        <td className="py-2 pr-3 font-semibold text-primary">
                          {item.officialId || item.id}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{item.topic || item.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {item.title}
                          </div>
                        </td>
                        <td className="py-2 pr-3">{item.phase || 'N/A'}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {item.countries.length > 0 ? item.countries.join(', ') : 'N/A'}
                        </td>
                        <td className="py-2 pr-3 text-xs">{item.startDate || '—'}</td>
                        <td className="py-2 pr-3 text-xs">{item.endDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {searchResult.metadata.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {searchResult.metadata.currentPage} of {searchResult.metadata.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, searchResult.metadata.totalPages))}
                    disabled={page >= searchResult.metadata.totalPages || isFetching}
                  >
                    Next
                  </Button>
                </div>
              )}

              {searchResult.rawData && searchResult.rawData.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold">Raw data preview</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Preview item</span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={selectedRawIdx}
                        onChange={(e) => setSelectedRawIdx(Number(e.target.value))}
                      >
                        {searchResult.rawData.map((item, idx) => (
                          <option key={idx} value={idx}>
                            {item?.official_investigation_number ||
                              item?.['Investigation Number'] ||
                              item?.investigation_id ||
                              `Item ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showRaw && (
                    <div className="space-y-2">
                      {searchResult.rawData.map((item, idx) => (
                        <details key={idx} className="rounded border border-muted p-2">
                          <summary className="cursor-pointer text-sm font-semibold">
                            {item?.official_investigation_number ||
                              item?.['Investigation Number'] ||
                              item?.investigation_id ||
                              'Item'}
                          </summary>
                          <div className="mt-2">
                            <TreeView data={item} depth={0} />
                          </div>
                        </details>
                      ))}
                    </div>
                  )}

                  {selectedRaw && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <CaseDashboardRawMapfordev raw={selectedRaw} />
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <CaseDashboardRawMapforuser raw={selectedRaw} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!searchResult.rawData && showRaw && (
                <div className="text-xs text-muted-foreground">Raw data 尚未載入，請重新搜尋。</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const INDENT = 12;

const TreeView: React.FC<{ data: any; depth: number }> = ({ data, depth }) => {
  if (data === null || data === undefined) {
    return <div style={{ paddingLeft: depth * INDENT }} className="text-xs text-muted-foreground">null</div>;
  }

  if (typeof data !== 'object') {
    return (
      <div style={{ paddingLeft: depth * INDENT }} className="text-xs">
        {String(data)}
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div style={{ paddingLeft: depth * INDENT }} className="space-y-1">
        {data.map((item, idx) => (
          <details key={idx} className="rounded border border-muted/50 p-1">
            <summary className="text-xs font-semibold">[{idx}]</summary>
            <TreeView data={item} depth={depth + 1} />
          </details>
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * INDENT }} className="space-y-1">
      {Object.entries(data).map(([key, value]) => (
        <details key={key} className="rounded border border-muted/50 p-1">
          <summary className="text-xs font-semibold">{key}</summary>
          <TreeView data={value} depth={depth + 1} />
        </details>
      ))}
    </div>
  );
};



