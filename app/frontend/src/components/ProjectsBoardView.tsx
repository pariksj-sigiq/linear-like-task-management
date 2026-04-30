import { Link } from "react-router-dom";
import { Box } from "lucide-react";
import type { Project } from "../linearTypes";
import { initials, issueKey, projectTitle, userName } from "../linearTypes";
import { StatusGlyph } from "./IssueExplorer";
import { LinearBoard, LinearBoardCard, LinearBoardColumn } from "./LinearBoard";
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
    <LinearBoard testId="projects-board" label="Projects board">
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
    </LinearBoard>
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
    <LinearBoardColumn
      testId={`projects-board-column-${status.toLowerCase().replace(/\s+/g, "-")}`}
      icon={<StatusGlyph state={status} />}
      label={label}
      count={count}
      menuLabel={`${label} options`}
      createLabel={`Create project in ${label}`}
    >
      {projects.map((project) => (
        <BoardCard key={project.id || project.key || projectTitle(project)} project={project} />
      ))}
    </LinearBoardColumn>
  );
}

function BoardCard({ project }: { project: Project }) {
  const id = project.id || project.key;
  const issuePreview = (project.issues || []).slice(0, 3);
  const issueCount =
    (project as Project & { issue_count?: number }).issue_count ??
    project.issues?.length ??
    0;
  const lead = userName(project.lead || project.lead_name || "");
  return (
    <LinearBoardCard testId={`projects-board-card-${id}`} className="p-0">
      <Link
        to={`/project/${id}/overview`}
        className={cn("group flex flex-col gap-1.5 px-3 py-2.5")}
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
        {issuePreview.length > 0 ? (
          <div className="flex min-w-0 flex-wrap gap-1 pl-[22px] pt-0.5">
            {issuePreview.map((issue) => (
              <span
                key={issueKey(issue)}
                className="max-w-[5.5rem] truncate rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                title={`${issueKey(issue)} ${issue.title || ""}`.trim()}
              >
                {issueKey(issue)}
              </span>
            ))}
            {issueCount > issuePreview.length ? (
              <span className="rounded border border-transparent px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                +{issueCount - issuePreview.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </Link>
    </LinearBoardCard>
  );
}
