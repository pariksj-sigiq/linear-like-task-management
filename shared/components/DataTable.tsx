import { ReactNode } from "react";

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
        className="flex items-center justify-center py-12 text-sm"
        style={{ color: "var(--text-secondary)" }}
        data-testid="table-loading"
      >
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12 text-sm"
        style={{ color: "var(--text-secondary)" }}
        data-testid="table-empty"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm" data-testid="data-table">
        <thead>
          <tr style={{ backgroundColor: "var(--content-bg)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider"
                style={{ color: "var(--text-secondary)", width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-t ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card-bg)" }}
              data-testid={`table-row-${i}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
