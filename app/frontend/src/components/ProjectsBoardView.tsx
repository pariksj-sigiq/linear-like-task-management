import { Link } from "react-router-dom";
import { Box, MoreHorizontal, Plus } from "lucide-react";
import type { Project } from "../linearTypes";
import { initials, projectTitle, userName } from "../linearTypes";
import { StatusGlyph } from "./IssueExplorer";
import { cn } from "../lib/utils";

export const BOARD_STATUS_COLUMNS = [
  { key: "Backlog", label: "Backlog" },
  { key: "Planned", label: "Planned" },
  { key: "In Progress", label: "In progress" },
  { key: "Completed", label: "Completed" },
  { key: "Canceled", label: "Canceled" },
] as const;

type BoardColumnKey = (typeof BOARD_STATUS_COLUMNS)[number]["key"];

export function projectBoardColumn(project: Project): BoardColumnKey {
  const raw = String(project.status || project.state || "backlog").toLowerCase();
  if (raw.includes("cancel")) return "Canceled";
  if (raw.includes("complete") || raw.includes("done") || raw.includes("passed")) return "Completed";
  if (raw.includes("progress") || raw.includes("active") || raw.includes("started") || raw.includes("qa") || raw.includes("review") || raw.includes("change"))
    return "In Progress";
  if (raw.includes("plan")) return "Planned";
  return "Backlog";
}

export function ProjectsBoardView({ projects }: { projects: Project[] }) {
  const grouped = BOARD_STATUS_COLUMNS.reduce<Record<BoardColumnKey, Project[]>>(
    (acc, col) => {
      acc[col.key] = projects.filter((p) => projectBoardColumn(p) === col.key);
      return acc;
    },
    {
      Backlog: [],
      Planned: [],
      "In Progress": [],
      Completed: [],
      Canceled: [],
    },
  );

  return (
    <div
      className="flex h-full min-h-[480px] gap-0 overflow-x-auto"
      data-testid="projects-board"
      role="group"
      aria-label="Projects board"
    >
      {BOARD_STATUS_COLUMNS.map((col) => {
        const items = grouped[col.key];
        return (
          <BoardColumn
            key={col.key}
            status={col.key}
            label={col.label}
            count={items.length}
            projects={items}
          />
        );
      })}
    </div>
  );
}

function BoardColumn({
  status,
  label,
  count,
  projects,
}: {
  status: BoardColumnKey;
  label: string;
  count: number;
  projects: Project[];
}) {
  return (
    <div
      className="flex w-[320px] shrink-0 flex-col border-r border-border/70 last:border-r-0"
      data-testid={`projects-board-column-${status.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex h-9 items-center gap-2 px-3">
        <StatusGlyph state={status} />
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">{count}</span>
        <span className="flex-1" />
        <button
          type="button"
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted/60"
          aria-label={`${label} options`}
          tabIndex={-1}
        >
          <MoreHorizontal size={14} />
        </button>
        <button
          type="button"
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted/60"
          aria-label={`Create project in ${label}`}
          tabIndex={-1}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto px-2 pt-1 pb-4">
        {projects.map((project) => (
          <BoardCard key={project.id || project.key || projectTitle(project)} project={project} />
        ))}
      </div>
    </div>
  );
}

function BoardCard({ project }: { project: Project }) {
  const id = project.id || project.key;
  const issueCount =
    (project as Project & { issue_count?: number }).issue_count ??
    project.issues?.length ??
    0;
  const lead = userName(project.lead || project.lead_name || "");
  return (
    <Link
      to={`/project/${id}/overview`}
      className={cn(
        "group flex flex-col gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-muted/40",
      )}
      data-testid={`projects-board-card-${id}`}
    >
      <div className="flex items-start gap-2">
        <Box size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {projectTitle(project)}
        </span>
        <StatusGlyph state={project.state || project.status || "Backlog"} />
        {lead ? (
          <span className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {initials(lead)}
          </span>
        ) : null}
      </div>
      <div className="pl-[22px] text-[12px] text-muted-foreground">
        {issueCount} {issueCount === 1 ? "issue" : "issues"}
      </div>
    </Link>
  );
}
