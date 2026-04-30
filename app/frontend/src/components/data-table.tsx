import type { ReactNode } from "react";
import { ArrowUpDown, CheckSquare, Columns3, MoreHorizontal } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

export interface WorkspaceTableRow<T = unknown> {
  id: string;
  key: string;
  title: string;
  status: string;
  assignee: string;
  project?: string;
  updated?: string;
  estimate?: string | number | null;
  priority?: ReactNode;
  statusIcon?: ReactNode;
  avatar?: ReactNode;
  original?: T;
}

interface DataTableProps<T = unknown> {
  rows: Array<WorkspaceTableRow<T>>;
  selectedIds?: string[];
  density?: "compact" | "comfortable";
  emptyLabel?: string;
  testId?: string;
  onToggleSelected?: (id: string) => void;
  onToggleAll?: () => void;
  onOpenRow?: (row: WorkspaceTableRow<T>) => void;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DataTable<T = unknown>({
  rows,
  selectedIds = [],
  density = "compact",
  emptyLabel = "No rows",
  testId = "issue-list",
  onToggleSelected,
  onToggleAll,
  onOpenRow,
}: DataTableProps<T>) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const rowHeight = density === "comfortable" ? "h-12" : "h-9";

  return (
    <div data-slot="table-card" className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex min-h-9 items-center justify-between border-b border-border px-2.5 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CheckSquare className="size-3.5" aria-hidden="true" />
          {selectedIds.length} selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Columns3 className="size-3.5" aria-hidden="true" />
          Columns
        </span>
      </div>
      <table data-slot="table" className="w-full table-fixed border-collapse text-[13px]" data-testid={testId}>
        <thead data-slot="table-header" className="bg-muted/40 text-[11px] text-muted-foreground">
          <tr className="border-b border-border">
            <th className="w-9 px-2 py-2 text-left">
              <Checkbox
                aria-label="Select all rows"
                checked={allSelected}
                onCheckedChange={() => onToggleAll?.()}
                disabled={!onToggleAll || rows.length === 0}
              />
            </th>
            <th className="px-2 py-2 text-left font-medium">
              <span className="inline-flex items-center gap-1">
                Issue <ArrowUpDown className="size-3" aria-hidden="true" />
              </span>
            </th>
            <th className="hidden w-32 px-2 py-2 text-left font-medium md:table-cell">Status</th>
            <th className="hidden w-40 px-2 py-2 text-left font-medium lg:table-cell">Assignee</th>
            <th className="hidden w-48 px-2 py-2 text-left font-medium xl:table-cell">Project</th>
            <th className="w-24 px-2 py-2 text-right font-medium">Updated</th>
            <th className="w-8 px-2 py-2" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody data-slot="table-body">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="h-24 px-3 text-center text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                data-slot="table-row"
                data-testid={`issue-row-${row.key}`}
                className={classNames("border-b border-border text-muted-foreground hover:bg-muted/60", rowHeight)}
                onDoubleClick={() => onOpenRow?.(row)}
              >
                <td className="px-2">
                  <Checkbox
                    aria-label={`Select ${row.key}`}
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => onToggleSelected?.(row.id)}
                  />
                </td>
                <td className="min-w-0 px-2">
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left text-foreground"
                    onClick={() => onOpenRow?.(row)}
                  >
                    {row.priority}
                    <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{row.key}</span>
                    {row.statusIcon}
                    <span className="truncate font-medium">{row.title}</span>
                  </button>
                </td>
                <td className="hidden px-2 md:table-cell">
                  <Badge variant="outline" className="max-w-full gap-1.5 text-muted-foreground">
                    {row.statusIcon}
                    <span className="truncate">{row.status}</span>
                  </Badge>
                </td>
                <td className="hidden min-w-0 px-2 lg:table-cell">
                  <span className="flex min-w-0 items-center gap-2">
                    {row.avatar}
                    <span className="truncate">{row.assignee}</span>
                  </span>
                </td>
                <td className="hidden min-w-0 px-2 xl:table-cell">
                  <span className="truncate">{row.project || "No project"}</span>
                </td>
                <td className="px-2 text-right text-[12px] tabular-nums text-muted-foreground">{row.updated}</td>
                <td className="px-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${row.key} menu`}
                  >
                    <MoreHorizontal className="size-3.5" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
