import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUstr301Query, UstrSortDir, UstrSortKey, type Ustr301Item } from '@/hooks/queries/useUstr301Query';

type ListFilter = string;
type RateFilter = string;

const DEFAULT_LIST_OPTIONS: ListFilter[] = ['1', '2', '3', '4', '4A', '4B'];
const DEFAULT_RATE_OPTIONS: RateFilter[] = ['7.5%', '10%', '15%', '25%', '0%'];
const DEFAULT_FILTERS = { q: '', list: 'ALL' as ListFilter, rate: 'ALL' as RateFilter };

export const Ustr301Explorer: React.FC = () => {
  const [q, setQ] = useState(DEFAULT_FILTERS.q);
  const [list, setList] = useState<ListFilter>(DEFAULT_FILTERS.list);
  const [rate, setRate] = useState<RateFilter>(DEFAULT_FILTERS.rate);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<UstrSortKey>('hts');
  const [sortDir, setSortDir] = useState<UstrSortDir>('asc');
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);

  const queryArgs = useMemo(
    () => ({
      q: activeFilters.q,
      list: activeFilters.list,
      rate: activeFilters.rate,
      page,
      pageSize,
      sortKey,
      sortDir,
    }),
    [activeFilters, page, pageSize, sortKey, sortDir]
  );

  const ustrQuery = useUstr301Query(queryArgs);
  const loading = ustrQuery.isLoading || ustrQuery.isFetching;
  const error = ustrQuery.error ? (ustrQuery.error instanceof Error ? ustrQuery.error.message : String(ustrQuery.error)) : null;
  const items: Ustr301Item[] = ustrQuery.data?.items ?? [];
  const total = ustrQuery.data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const availableLists = ustrQuery.data?.listOptions?.length ? ustrQuery.data.listOptions : DEFAULT_LIST_OPTIONS;
  const availableRates = ustrQuery.data?.rateOptions?.length ? ustrQuery.data.rateOptions : DEFAULT_RATE_OPTIONS;
  const listOptions = useMemo(() => ['ALL', ...availableLists], [availableLists]);
  const rateOptions = useMemo(() => ['ALL', ...availableRates], [availableRates]);

  useEffect(() => {
    if (list !== 'ALL' && availableLists.length && !availableLists.includes(list)) {
      setList('ALL');
    }
  }, [list, availableLists]);

  useEffect(() => {
    if (rate !== 'ALL' && availableRates.length && !availableRates.includes(rate)) {
      setRate('ALL');
    }
  }, [rate, availableRates]);

  function handleSearch() {
    const trimmed = q.trim();
    setPage(1);
    setActiveFilters({ q: trimmed, list, rate });
  }

  function toggleSort(key: UstrSortKey) {
    const nextDir: UstrSortDir = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortKey(key);
    setSortDir(nextDir);
    setPage(1);
  }

  const sortedItems = items;

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">USTR 301 Explorer</h3>
        <p className="text-sm text-muted-foreground">查詢與篩選 USTR Section 301 清單（支援 8/10 位 HTS）。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">HTS 查詢（可輸入 8/10 位）</label>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="例如 85176200 或 8517.62.0090" onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">List</label>
          <Select value={list} onValueChange={(value: ListFilter) => setList(value)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {listOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === 'ALL' ? 'ALL' : `List ${value}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Rate</label>
          <Select value={rate} onValueChange={(value: RateFilter) => setRate(value)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {rateOptions.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Page</label>
          <Input type="number" min={1} value={page} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPage(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="flex gap-2">
          <Button className="grow" onClick={handleSearch}>搜尋</Button>
          <Button variant="outline" onClick={() => { setQ(''); setList('ALL'); setRate('ALL'); setActiveFilters(DEFAULT_FILTERS); setPage(1); }}>重置</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>共 {total} 筆，頁次 {page} / {totalPages}</span>
        <span>排序 {sortKey.toUpperCase()}（{sortDir === 'asc' ? '升冪' : '降冪'}）</span>
      </div>

      <div className="overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                { key: 'hts', label: 'HTS Code', sortable: true },
                { key: 'list', label: 'List', sortable: true },
                { key: 'rate', label: 'Rate', sortable: true },
                { key: 'effective', label: 'Effective Date', sortable: true },
                { key: 'action', label: 'Action', sortable: true },
                { key: 'description', label: 'Description', sortable: false },
                { key: 'note', label: 'Note', sortable: false },
              ].map(col => (
                <TableHead
                  key={col.key}
                  className={col.sortable ? 'cursor-pointer select-none' : undefined}
                  onClick={() => col.sortable && toggleSort(col.key as UstrSortKey)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      <Badge variant="outline" className="text-[10px]">{sortDir === 'asc' ? 'ASC' : 'DESC'}</Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Loading ...</TableCell>
              </TableRow>
            ) : items.length ? (
              items.map((item, idx) => (
                <TableRow key={`${item.hts}_${idx}`}>
                  <TableCell className="font-mono">{item.hts || '—'}</TableCell>
                  <TableCell>{item.list_base ? <Badge variant="secondary">{item.list_base}</Badge> : '—'}</TableCell>
                  <TableCell>{item.max_rate_text || '—'}</TableCell>
                  <TableCell>{item.effective_date || '—'}</TableCell>
                  <TableCell className="max-w-xs">{item.action_title || '—'}</TableCell>
                  <TableCell className="max-w-lg">{item.description || '—'}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">{item.note || '—'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">沒有資料</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3 text-sm justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <span>每頁筆數</span>
          <Select value={String(pageSize)} onValueChange={(value: string) => { setPageSize(Number(value) || 10); setPage(1); }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    </Card>
  );
};

export default Ustr301Explorer;
