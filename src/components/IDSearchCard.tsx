import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Skeleton } from './ui/skeleton';
import { Loader2, Search, Eye } from 'lucide-react';
import type { FlatInvestigation } from '@/types/usitc-schema';
import CaseDashboardRawMapforuser from './CaseDashboardRawMapforuser';

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

interface IDSearchCardProps {
  defaultCountry?: string;
  defaultOrderNumber?: string;
  defaultOfficialId?: string;
  defaultStatus?: string;
  autoSearch?: boolean;
  title?: string;
}

export const IDSearchCard: React.FC<IDSearchCardProps> = ({
  defaultCountry = '',
  defaultOrderNumber = '',
  defaultOfficialId = '',
  defaultStatus = '',
  autoSearch = false,
  title,
}) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;

  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState(defaultCountry);
  const [status, setStatus] = useState(defaultStatus);
  const [officialId, setOfficialId] = useState(defaultOfficialId);
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber);
  const [page, setPage] = useState(1);
  const [selectedRawIdx, setSelectedRawIdx] = useState<number | null>(null);
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
      'id-search-card',
      submitted.keyword,
      submitted.country,
      submitted.status,
      submitted.officialId,
      submitted.orderNumber,
      page,
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

  useEffect(() => {
    setCountry(defaultCountry);
    setOrderNumber(defaultOrderNumber);
    setOfficialId(defaultOfficialId);
    setStatus(defaultStatus);
    if (autoSearch && (defaultCountry || defaultOrderNumber || defaultOfficialId || defaultStatus)) {
      setSubmitted({
        keyword: '',
        country: defaultCountry.trim(),
        status: defaultStatus.trim(),
        officialId: defaultOfficialId.trim(),
        orderNumber: defaultOrderNumber.trim(),
      });
      setPage(1);
    }
  }, [defaultCountry, defaultOrderNumber, defaultOfficialId, defaultStatus, autoSearch]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    if (searchResult?.rawData && searchResult.rawData.length > 0) {
      setSelectedRawIdx(0);
    } else {
      setSelectedRawIdx(null);
    }
  }, [searchResult?.rawData]);

  const selectedRaw =
    selectedRawIdx !== null &&
    searchResult?.rawData &&
    searchResult.rawData[selectedRawIdx]
      ? searchResult.rawData[selectedRawIdx]
      : null;

  return (
    <Card className="p-4 md:p-6 space-y-4 border border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="text-lg text-foreground">
          {title || tAny('idSearch.title', { defaultValue: 'USITC Investigation Search' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <Input
              placeholder={tAny('idSearch.keyword', { defaultValue: 'Keyword (topic/product/country)' })}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
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
                  {opt || tAny('idSearch.allStatuses', { defaultValue: 'All statuses' })}
                </option>
              ))}
            </select>
            <Input
              placeholder={tAny('idSearch.invNumber', { defaultValue: 'Inv. Number (e.g., 701-253)' })}
              value={officialId}
              onChange={(e) => setOfficialId(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isFetching}
            />
            <div className="flex justify-end md:justify-start">
              <Button
                onClick={handleSearch}
                className="w-full md:w-auto"
                disabled={
                  isFetching ||
                  (!queryEnabled && !keyword && !country && !status && !officialId && !orderNumber)
                }
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {tAny('common.search', { defaultValue: 'Search' })}
              </Button>
            </div>
          </div>
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
              {tAny('idSearch.error', { defaultValue: 'Failed to load search results.' })}{' '}
              {error?.message}
            </div>
          )}
          {!isFetching && searchResult && searchResult.data.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {tAny('idSearch.noResults', { defaultValue: 'No results found for current filters.' })}
            </div>
          )}
          {searchResult && searchResult.data.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {tAny('idSearch.showing', { defaultValue: 'Showing' })}{' '}
                  {searchResult.metadata.totalItems > searchResult.metadata.pageSize
                    ? `${(searchResult.metadata.currentPage - 1) * searchResult.metadata.pageSize + 1}-${Math.min(
                        searchResult.metadata.currentPage * searchResult.metadata.pageSize,
                        searchResult.metadata.totalItems
                      )}`
                    : searchResult.metadata.totalItems}{' '}
                  {tAny('idSearch.of', { defaultValue: 'of' })} {searchResult.metadata.totalItems}{' '}
                  {tAny('idSearch.results', { defaultValue: 'results.' })}
                </span>
                {searchResult.metadata.sourceDataTimestamp && (
                  <span className="text-xs">
                    {tAny('idSearch.source', { defaultValue: 'Source' })}:{' '}
                    {new Date(searchResult.metadata.sourceDataTimestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto rounded-md border border-border bg-muted/30">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">{tAny('idSearch.table.invNumber', { defaultValue: 'Inv. Number' })}</th>
                      <th className="py-2 pr-3">{tAny('idSearch.table.topic', { defaultValue: 'Topic' })}</th>
                      <th className="py-2 pr-3">{tAny('idSearch.table.phase', { defaultValue: 'Phase' })}</th>
                      <th className="py-2 pr-3">{tAny('idSearch.table.countries', { defaultValue: 'Countries' })}</th>
                      <th className="py-2 pr-3">{tAny('idSearch.table.startDate', { defaultValue: 'Start Date' })}</th>
                      <th className="py-2 pr-3">{tAny('idSearch.table.endDate', { defaultValue: 'End Date' })}</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.data.map((item, idx) => (
                      <tr key={item.id} className="border-b border-border last:border-none">
                        <td className="py-2 pr-3 font-semibold text-primary">
                          {item.officialId || item.legacyId || item.id}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{item.topic || item.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{item.title}</div>
                        </td>
                        <td className="py-2 pr-3">{item.phase || 'N/A'}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {item.countries.length > 0 ? item.countries.join(', ') : 'N/A'}
                        </td>
                        <td className="py-2 pr-3 text-xs">{item.startDate || '—'}</td>
                        <td className="py-2 pr-3 text-xs">{item.endDate || '—'}</td>
                        <td className="py-2 pr-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRawIdx(idx)}
                            disabled={!searchResult.rawData || !searchResult.rawData[idx]}
                          >
                            <Eye className="h-4 w-4 mr-1" /> {tAny('common.view', { defaultValue: 'View' })}
                          </Button>
                        </td>
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
                    {tAny('common.prev', { defaultValue: 'Previous' })}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {tAny('common.pageOf', {
                      defaultValue: 'Page {{current}} of {{total}}',
                      current: searchResult.metadata.currentPage,
                      total: searchResult.metadata.totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, searchResult.metadata.totalPages))}
                    disabled={page >= searchResult.metadata.totalPages || isFetching}
                  >
                    {tAny('common.next', { defaultValue: 'Next' })}
                  </Button>
                </div>
              )}
              {selectedRaw && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <CaseDashboardRawMapforuser raw={selectedRaw} />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

