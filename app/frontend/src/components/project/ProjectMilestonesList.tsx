import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Plus, Trash2 } from "lucide-react";
import { readTool } from "../../api";
import { cn } from "../../lib/utils";
import { formatDate } from "../../linearTypes";
import { Button } from "../ui";
import { Input } from "../ui/input";

interface Milestone {
  id?: string;
  project_id?: string;
  name?: string;
  target_date?: string | null;
  status?: string;
  sort_order?: number;
}

interface ProjectMilestonesListProps {
  projectId: string;
  milestones: Milestone[];
  onChange: () => void | Promise<void>;
}

export function ProjectMilestonesList({
  projectId,
  milestones,
  onChange,
}: ProjectMilestonesListProps) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(milestones);

  useEffect(() => {
    setLocalMilestones(milestones);
  }, [milestones]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !projectId) return;
    setSubmitting(true);
    const response = await readTool("create_milestone", {
      project_id: projectId,
      name: name.trim(),
      target_date: targetDate || undefined,
    });
    setSubmitting(false);
    if (response.error) {
      console.warn("create_milestone failed:", response.error);
      return;
    }
    setName("");
    setTargetDate("");
    setAdding(false);
    await onChange();
  };

  const toggleStatus = async (milestone: Milestone) => {
    if (!milestone.id) return;
    const next = (milestone.status || "planned").toLowerCase() === "completed"
      ? "planned"
      : "completed";
    // Optimistic local update.
    setLocalMilestones((current) =>
      current.map((item) => (item.id === milestone.id ? { ...item, status: next } : item)),
    );
    const response = await readTool("update_milestone", { id: milestone.id, status: next });
    if (response.error) {
      console.warn("update_milestone failed:", response.error);
    }
    await onChange();
  };

  const removeMilestone = async (milestone: Milestone) => {
    if (!milestone.id) return;
    setLocalMilestones((current) => current.filter((item) => item.id !== milestone.id));
    const response = await readTool("delete_milestone", { id: milestone.id });
    if (response.error) {
      console.warn("delete_milestone failed:", response.error);
    }
    await onChange();
  };

  const isEmpty = localMilestones.length === 0;

  return (
    <section className="rounded-xl border border-border bg-background p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]" data-testid="project-milestones">
      <div className="flex items-center justify-between gap-2 px-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-1 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6f6f6f] transition-colors hover:text-foreground"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Milestones
          {!isEmpty && (
            <span className="rounded bg-muted px-1 tabular-nums text-[10px] text-muted-foreground">
              {localMilestones.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Add milestone"
          onClick={() => {
            setOpen(true);
            setAdding(true);
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      {open && (
        <div className="mt-2 grid gap-1 px-2">
          {isEmpty && !adding && (
            <p className="text-xs text-muted-foreground">
              Add milestones to organize work within your project and break it into more granular
              stages.
            </p>
          )}
          {localMilestones.map((milestone) => {
            const isDone = (milestone.status || "").toLowerCase() === "completed";
            return (
              <div
                key={milestone.id || milestone.name}
                className="group/milestone flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60"
                data-testid={`project-milestone-${milestone.id}`}
              >
                <button
                  type="button"
                  className="inline-flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={isDone ? "Mark milestone incomplete" : "Mark milestone complete"}
                  onClick={() => toggleStatus(milestone)}
                >
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-[#5e6ad2]" />
                  ) : (
                    <CircleDashed size={14} />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 truncate",
                    isDone && "text-muted-foreground line-through",
                  )}
                >
                  {milestone.name || "Milestone"}
                </span>
                {milestone.target_date && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(milestone.target_date)}
                  </span>
                )}
                <button
                  type="button"
                  className="invisible inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/milestone:visible"
                  aria-label="Delete milestone"
                  onClick={() => removeMilestone(milestone)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {adding && (
            <form onSubmit={submit} className="mt-1 grid gap-1 rounded-md border border-border bg-muted/30 p-2">
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Milestone name"
                className="h-7 text-xs"
                data-testid="project-milestone-name"
              />
              <Input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="h-7 text-xs"
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setName("");
                    setTargetDate("");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || !name.trim()}>
                  {submitting ? "Adding..." : "Add"}
                </Button>
              </div>
            </form>
          )}
          {!adding && !isEmpty && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus size={12} /> Add milestone
            </button>
          )}
        </div>
      )}
    </section>
  );
}
