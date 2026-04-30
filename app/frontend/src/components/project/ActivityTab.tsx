import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Check, ChevronDown, SendHorizonal } from "lucide-react";
import { readTool, collectionFrom } from "../../api";
import { useAuth } from "../../auth";
import {
  avatarColor,
  formatDate,
  initials,
  userName,
  type Project,
  type ProjectUpdate,
} from "../../linearTypes";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type HealthKey = "on_track" | "at_risk" | "off_track" | "unknown";
type Mode = "comment" | "update";

interface HealthOption {
  key: HealthKey;
  label: string;
  color: string;
}

const HEALTH_OPTIONS: HealthOption[] = [
  { key: "on_track", label: "On track", color: "#22c55e" },
  { key: "at_risk", label: "At risk", color: "#facc15" },
  { key: "off_track", label: "Off track", color: "#ef4444" },
];

const UNKNOWN_HEALTH: HealthOption = { key: "unknown", label: "Unknown", color: "#94a3b8" };

function healthOption(key: string | undefined | null): HealthOption {
  const match = HEALTH_OPTIONS.find((option) => option.key === key);
  return match || UNKNOWN_HEALTH;
}

function relativeDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

interface ActivityRow {
  id: string;
  timestamp: string;
  kind: "update" | "created" | "lead";
  icon: React.ReactNode;
  body: React.ReactNode;
  meta?: React.ReactNode;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="inline-grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  );
}

function HealthDot({ option }: { option: HealthOption }) {
  return (
    <span
      className="inline-block size-2 rounded-full"
      style={{ backgroundColor: option.color }}
      aria-hidden="true"
    />
  );
}

function HealthGlyph({ option, className }: { option: HealthOption; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", className)}
      fill="none"
      stroke={option.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 9h3l2-5 3 8 2-4h4" />
    </svg>
  );
}

export function ProjectActivityTab({
  project,
  onChange,
  focusComposer,
}: {
  project: Project;
  onChange: () => void | Promise<void>;
  focusComposer?: boolean;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("update");
  const [body, setBody] = useState("");
  const [updateHealth, setUpdateHealth] = useState<HealthKey>(
    (project.health as HealthKey) && project.health !== "unknown"
      ? (project.health as HealthKey)
      : "on_track",
  );
  const [updates, setUpdates] = useState<ProjectUpdate[]>(project.updates || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const projectId = project.id;

  useEffect(() => {
    // Sync with parent project updates when refreshed
    setUpdates(project.updates || []);
  }, [project.updates]);

  useEffect(() => {
    if (focusComposer) {
      textareaRef.current?.focus();
    }
  }, [focusComposer]);

  useEffect(() => {
    let cancelled = false;
    async function loadUpdates() {
      if (!projectId) return;
      const response = await readTool("list_project_updates", { id: projectId });
      if (cancelled) return;
      const fresh = collectionFrom<ProjectUpdate>(response.data, ["updates", "project_updates"]);
      if (fresh.length > 0) setUpdates(fresh);
    }
    void loadUpdates();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const currentUserId = user?.id;
  const currentHealthOption = healthOption(updateHealth);

  const rows = useMemo<ActivityRow[]>(() => {
    const items: ActivityRow[] = [];

    for (const update of updates) {
      const authorName =
        (update as ProjectUpdate & { author_name?: string }).author_name ||
        userName(update.author);
      const uHealth = healthOption(
        (update as ProjectUpdate & { health?: string }).health,
      );
      items.push({
        id: update.id || `u-${update.created_at || authorName}`,
        timestamp: update.created_at || "",
        kind: "update",
        icon: <Avatar name={authorName} />,
        body: (
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-medium text-foreground">{authorName}</span>
            <span className="text-muted-foreground">posted an update</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs font-normal">
              <HealthDot option={uHealth} />
              <span className="text-foreground">{uHealth.label}</span>
            </span>
          </span>
        ),
        meta: update.body || update.text ? (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-foreground/80">
            {update.body || update.text}
          </p>
        ) : null,
      });
    }

    const leadName = (project as Project & { lead_name?: string }).lead_name || userName(project.lead);
    if (project.lead || (project as Project & { lead_name?: string }).lead_name) {
      items.push({
        id: "lead-assignment",
        timestamp: (project as Project & { created_at?: string }).created_at || "",
        kind: "lead",
        icon: (
          <span className="inline-grid size-6 shrink-0 place-items-center text-muted-foreground">
            <Activity size={14} />
          </span>
        ),
        body: (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Lead:</span>
            <Avatar name={leadName} />
            <span className="text-foreground">{leadName}</span>
            <span>assigned</span>
          </span>
        ),
      });
    }

    const createdAt = (project as Project & { created_at?: string }).created_at;
    if (createdAt) {
      const creatorName = leadName || "Someone";
      items.push({
        id: "created-event",
        timestamp: createdAt,
        kind: "created",
        icon: (
          <span className="inline-grid size-6 shrink-0 place-items-center text-muted-foreground">
            <Activity size={14} />
          </span>
        ),
        body: (
          <span className="text-sm text-muted-foreground">
            <span className="text-foreground">{creatorName}</span> created the project
          </span>
        ),
      });
    }

    items.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return items;
  }, [updates, project]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId || !body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    const health =
      mode === "update"
        ? updateHealth
        : ((project.health as HealthKey) || "on_track");

    const response = await readTool("post_project_update", {
      project_id: projectId,
      author_id: currentUserId || undefined,  // Let backend handle if null
      body: mode === "comment" ? `[comment] ${body}` : body,
      health,
    });

    setSubmitting(false);
    if (response.error) {
      setError(response.error);
      return;
    }

    setBody("");
    // refresh local updates immediately
    const refreshed = await readTool("list_project_updates", { id: projectId });
    const fresh = collectionFrom<ProjectUpdate>(refreshed.data, ["updates", "project_updates"]);
    if (fresh.length) setUpdates(fresh);
    await onChange();
  };

  const placeholder = mode === "comment" ? "Leave a comment..." : "Write a project update...";
  const submitLabel = mode === "comment" ? "Comment" : "Post update";

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-8 px-10 py-8" data-testid="project-activity-tab">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card shadow-sm"
        data-testid="project-activity-composer"
      >
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
          <div className="flex items-center rounded-full border border-border bg-background p-0">
            {(["comment", "update"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium transition-all",
                  mode === item
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`project-activity-mode-${item}`}
              >
                {item === "comment" ? "Comment" : "Update"}
              </button>
            ))}
          </div>
          {mode === "update" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  data-testid="project-activity-health-trigger"
                >
                  <Check
                    size={14}
                    className="shrink-0"
                    style={{ color: currentHealthOption.color, strokeWidth: 2.5 }}
                  />
                  <span>{currentHealthOption.label}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[10rem]">
                {HEALTH_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onSelect={() => setUpdateHealth(option.key)}
                    data-testid={`project-activity-health-${option.key}`}
                  >
                    <Check
                      size={16}
                      className="shrink-0"
                      style={{ color: option.color, strokeWidth: 2.5 }}
                    />
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          className="block w-full resize-none border-0 bg-transparent px-4 py-4 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:outline-none"
          style={{ minHeight: 132 }}
          data-testid="project-activity-textarea"
        />
        {error && (
          <div className="px-3 pb-2 text-xs text-destructive" role="alert">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={!body.trim() || submitting}
            className="h-6 gap-1.5 rounded-full px-2 text-xs font-medium"
            data-testid="project-activity-submit"
          >
            <SendHorizonal size={13} />
            {submitting ? "Posting..." : submitLabel}
          </Button>
        </div>
      </form>

      <div className="space-y-3" data-testid="project-activity-feed">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "flex items-start gap-2.5",
                row.kind === "lead" && "border-l-2 border-border pl-2.5",
              )}
              data-testid={`project-activity-row-${row.kind}`}
            >
              <div className="mt-0.5">{row.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm leading-5">
                  {row.body}
                  {row.timestamp && (
                    <span className="text-xs text-muted-foreground/80">
                      &middot; {relativeDate(row.timestamp)}
                    </span>
                  )}
                </div>
                {row.meta}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProjectActivityTab;
