﻿import React from 'react';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type SimpleColumn = { key: string; label: string };

interface CompareTableTanstackProps {
  data: any[];
  columns: SimpleColumn[]; // first should be 'year'
  percent: boolean; // whether to render non-year numbers as percent
  currentSortKey?: string;
  currentSortDesc?: boolean;
  onRequestGlobalSort?: (key: string, desc: boolean) => void;
}

export const CompareTableTanstack: React.FC<CompareTableTanstackProps> = ({ data, columns, percent, currentSortKey, currentSortDesc, onRequestGlobalSort }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const tanColumns = React.useMemo<ColumnDef<any>[]>(() => {
    const list = columns || [];
    return list.map((c) => ({
      accessorKey: c.key,
      header: c.label,
      enableSorting: true,
      cell: ({ row }) => {
        const v = row.getValue(c.key) as any;
        if (c.key !== 'year') {
          if (percent && typeof v === 'number' && isFinite(v)) {
            return `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
          }
          if (typeof v === 'number') return v.toLocaleString();
        }
        return v as any;
      },
    }));
  }, [columns, percent]);

  const table = useReactTable({
    data: data || [],
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // 同步外部排序狀態供箭頭顯示
  React.useEffect(() => {
    if (currentSortKey) {
      table.setSorting([{ id: currentSortKey, desc: !!currentSortDesc }]);
    }
  }, [currentSortKey, currentSortDesc]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                  onClick={() => {
                    const colId = header.column.id as string;
                    // year 欄通常不參與全域排序
                    if (!colId || colId === 'year') return;
                    const isSorted = header.column.getIsSorted();
                    const nextDesc = isSorted === 'asc' ? true : false; // toggle asc -> desc, desc/false -> asc
                    if (onRequestGlobalSort) {
                      onRequestGlobalSort(colId, nextDesc);
                    } else {
                      // fallback：僅本地排序
                      header.column.toggleSorting(nextDesc);
                    }
                  }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted() as string] ?? null}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={tanColumns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CompareTableTanstack;
