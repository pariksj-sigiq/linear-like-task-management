import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found.",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-12 text-sm text-muted-foreground"
        data-testid="table-loading"
      >
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12 text-sm text-muted-foreground"
        data-testid="table-empty"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table data-testid="data-table">
        <TableHeader>
          <TableRow className="bg-muted/40">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/60" : ""}
              data-testid={`table-row-${i}`}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
