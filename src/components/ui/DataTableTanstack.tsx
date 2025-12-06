import React from 'react';
import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type SimpleColumn = { key: string; label: string };

interface DataTableTanstackProps {
  data: any[];
  columns: SimpleColumn[];
}

export const DataTableTanstack: React.FC<DataTableTanstackProps> = ({ data, columns }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const tanColumns = React.useMemo<ColumnDef<any>[]>(() => {
    const list = columns || [];
    return list.map((c) => ({
      accessorKey: c.key,
      header: c.label,
      enableSorting: true,
      cell: ({ row }) => {
        const v = row.getValue(c.key) as any;
        if (typeof v === 'number') return (v as number).toLocaleString();
        return v as any;
      },
    }));
  }, [columns]);

  const table = useReactTable({
    data: data || [],
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
                  onClick={header.column.getToggleSortingHandler()}
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

export default DataTableTanstack;
