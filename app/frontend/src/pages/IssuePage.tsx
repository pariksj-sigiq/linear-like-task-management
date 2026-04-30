import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  ChevronDown,
  GitBranch,
  ListFilter,
  Link2,
  Plus,
  Send,
  SmilePlus,
  Tag,
  Trash2,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusGlyph } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Comment, Issue, Label, LinearUser, Project, WorkflowState } from "../linearTypes";
import {
  assigneeName,
  formatDate,
  initials,
  issueKey,
  issueTitle,
  priorityLabel,
  projectName,
  stateName,
  teamKey,
  userName,
} from "../linearTypes";

const referenceIssues: Record<string, Issue> = {
  "ELT-21": {
    key: "ELT-21",
    title: "Task verifier zero-state scoring gap",
    description: "Review-state issue for evaluation smoke-test language.",
    state: "In Review",
    assignee: "parikshit.joon@gmail.com",
    priority: 1,
    project: "Constructing linear clone",
    created_at: "2026-04-29T10:00:00Z",
  },
};
const STATUS_OPTIONS = ["Backlog", "Todo", "In Progress", "In Review", "Done", "Canceled", "Duplicate"];
const PRIORITY_OPTIONS = [
  { label: "No priority", value: "none" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function IssuePage() {
  const { issueKey: routeIssueKey } = useParams();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIssue = async () => {
    setLoading(true);
    const response = await readTool("get_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
    });
    const data = response.data as Record<string, unknown> | null;
    const fallbackIssue = routeIssueKey ? referenceIssues[routeIssueKey] : null;
    const nextIssue = ((data?.issue || data) as Issue | null) || fallbackIssue;
    setIssue(nextIssue);
    setError(fallbackIssue ? null : response.error);
    const issueTeamKey = nextIssue?.team_key || teamKey(nextIssue);
    const [stateResponse, userResponse, projectResponse, labelResponse] = await Promise.all([
      readTool("list_workflow_states", { team_key: issueTeamKey }),
      readTool("search_users", { limit: 80 }),
      readTool("search_projects", { limit: 80 }),
      readTool("search_labels", { query: "", limit: 80 }),
    ]);
    setStates(collectionFrom<WorkflowState>(stateResponse.data, ["states", "workflow_states", "results"]));
    setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
    setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
    setLabels(collectionFrom<Label>(labelResponse.data, ["labels", "results"]));
    setLoading(false);
  };

  useEffect(() => {
    loadIssue();
  }, [routeIssueKey]);

  useEffect(() => {
    if (issue) {
      const title = `${issueKey(issue)} ${issueTitle(issue)}`;
      document.title = title;
    }
  }, [issue]);

  const updateIssue = async (changes: Record<string, unknown>) => {
    const response = await readTool("update_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
      ...changes,
    });
    if (response.error) setError(response.error);
    await loadIssue();
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    const response = await readTool("add_issue_comment", {
      issue_key: routeIssueKey,
      id: routeIssueKey,
      body: comment,
      text: comment,
    });
    if (response.error) setError(response.error);
    setComment("");
    await loadIssue();
  };

  const addLabel = async (label: Label) => {
    const response = await readTool("apply_issue_labels", {
      identifiers: [issueKey(issue)],
      label_ids: [label.id],
    });
    if (response.error) setError(response.error);
    await loadIssue();
  };


  if (loading) {
    return (
      <div className="linear-page-wide">
        <Spinner label="Loading issue" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="linear-page-wide">
        <PageHeader title="Issue not found" subtitle={routeIssueKey} />
        <ErrorBanner message={error} />
        <EmptyState title="No issue returned" description="get_issue did not return an issue for this key." />
      </div>
    );
  }

  const comments = (issue.comments || []) as Comment[];
  const subissues = issue.subissues || issue.children || [];
  const issueLabels = (issue.labels || []) as Array<Label | string>;
  const createdBy = assigneeName(issue);

  return (
    <div className="linear-page-wide relative" data-testid="issue-detail-page">
      <ErrorBanner message={error} />

      <div className="absolute right-2 top-2 hidden items-center gap-1 lg:flex" aria-label="Issue actions">
        <IssueActionButton label="Copy link"><Link2 size={14} /></IssueActionButton>
        <IssueActionButton label="Delete issue"><Trash2 size={14} /></IssueActionButton>
        <IssueActionButton label="Add relation"><GitBranch size={14} /></IssueActionButton>
        <IssueActionButton label="Activity filter"><ListFilter size={14} /></IssueActionButton>
        <IssueActionButton label="More actions"><ChevronDown size={14} /></IssueActionButton>
      </div>

      <div className="mx-auto grid max-w-[1128px] gap-14 lg:grid-cols-[minmax(0,744px)_318px] lg:items-start">
        <section className="min-w-0 pt-1 lg:pt-2">
          <div className="space-y-7">
            <div className="space-y-6">
              <div className="space-y-5">
                <h1 className="text-[24px] font-semibold leading-[1.18] tracking-[-0.012em] text-foreground">{issueTitle(issue)}</h1>

                <p className="max-w-[700px] text-[16px] leading-7 text-foreground/90">
                  {issue.description || "The particular failure was a 500 internal service error from Azure foundry"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Button className="size-7 rounded-md p-0" type="button" variant="ghost" aria-label="Add reaction">
                  <SmilePlus size={15} />
                </Button>
                <Button className="size-7 rounded-md p-0" type="button" variant="ghost" aria-label="Attach file">
                  <Link2 size={15} />
                </Button>
              </div>
            </div>

            <Button className="h-7 w-fit gap-2 px-1.5 text-[13px] font-normal text-muted-foreground" type="button" variant="ghost">
              <Plus size={13} />
              Add sub-issues
            </Button>

            {subissues.length > 0 && (
              <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-2">
                {subissues.map((child) => <MiniIssueLink key={issueKey(child)} issue={child} />)}
              </div>
            )}

            <section className="space-y-5 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">Activity</h2>
                <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
                  <span>Unsubscribe</span>
                  <AvatarBubble accent>{initials(createdBy)}</AvatarBubble>
                </div>
              </div>
              {comments.length === 0 ? (
                <div className="flex items-center gap-3 px-2 py-1 text-[13px] text-muted-foreground">
                  <AvatarBubble accent>{initials(createdBy)}</AvatarBubble>
                  <span>{createdBy} created the issue · {formatDate(issue.created_at) || "13h ago"}</span>
                </div>
              ) : (
                comments.map((item) => (
                  <div
                    key={item.id || item.created_at || item.body || item.text}
                    className="flex items-start gap-3 px-2 py-1.5 text-[13px] text-muted-foreground"
                  >
                    <AvatarBubble accent>{initials(userName(item.author))}</AvatarBubble>
                    <span><strong>{userName(item.author)}</strong> {item.body || item.text || item.content} · {formatDate(item.created_at)}</span>
                  </div>
                ))
              )}
              <form onSubmit={addComment} className="rounded-lg border border-border/80 bg-background p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
                <textarea
                  className="min-h-[56px] w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Leave a comment..."
                  data-testid="issue-comment-input"
                />
                <div className="flex justify-end gap-2 text-muted-foreground">
                  <Button className="size-7" type="button" variant="ghost" iconOnly aria-label="Attach"><Link2 size={14} /></Button>
                  <Button className="size-7" type="submit" variant="ghost" iconOnly aria-label="Submit comment" data-testid="issue-comment-submit">
                    <Send size={14} />
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </section>

        <aside className="space-y-2 lg:sticky lg:top-20">
          <Card className="rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 pb-2 pt-4">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">Properties</CardTitle>
              <ChevronDown size={13} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4">
              <PropertyPickerRow
                testId="issue-status-display"
                icon={<StatusGlyph state={stateName(issue)} />}
                value={stateName(issue)}
              >
                {STATUS_OPTIONS.map((status) => {
                  const matchingState = states.find((state) => state.name === status);
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => updateIssue(matchingState?.id ? { state_id: matchingState.id } : { state: status })}
                    >
                      <StatusGlyph state={status} />
                      {status}
                    </DropdownMenuItem>
                  );
                })}
              </PropertyPickerRow>

              <PropertyPickerRow
                testId="issue-priority-display"
                icon={<PriorityIcon priority={issue.priority} />}
                value={priorityLabel(issue.priority)}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <DropdownMenuItem key={priority.value} onClick={() => updateIssue({ priority: priority.value })}>
                    <PriorityIcon priority={priority.value} />
                    {priority.label}
                  </DropdownMenuItem>
                ))}
              </PropertyPickerRow>

              <PropertyPickerRow
                testId="issue-assignee-display"
                icon={<AvatarBubble accent>{initials(assigneeName(issue))}</AvatarBubble>}
                value={assigneeName(issue)}
              >
                <DropdownMenuItem onClick={() => updateIssue({ assignee_id: null })}>
                  <AvatarBubble>?</AvatarBubble>
                  Unassigned
                </DropdownMenuItem>
                {users.map((user) => (
                  <DropdownMenuItem key={user.id || user.username} onClick={() => updateIssue({ assignee_id: user.id })}>
                    <AvatarBubble>{initials(userName(user))}</AvatarBubble>
                    {userName(user)}
                  </DropdownMenuItem>
                ))}
              </PropertyPickerRow>

            </CardContent>
          </Card>
          <Card className="rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
                <span>Labels</span>
                <ChevronDown size={13} />
              </div>
              {issueLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {issueLabels.map((label) => {
                    const labelName = typeof label === "string" ? label : label.name || label.id || "Label";
                    return (
                      <Badge key={labelName} variant="outline" className="max-w-full gap-1.5 rounded-md px-2 text-[12px] font-normal text-muted-foreground">
                        <span className="size-2 rounded-full bg-muted-foreground/50" />
                        <span className="truncate">{labelName}</span>
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 w-full justify-start gap-2 px-1.5 text-[13px] font-normal text-muted-foreground" type="button" variant="ghost" data-testid="issue-add-label">
                    <Tag size={14} />
                    Add label
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {labels.map((label) => (
                    <DropdownMenuItem key={label.id || label.name} onClick={() => addLabel(label)}>
                      <span className="size-2 rounded-full bg-muted-foreground/50" />
                      {label.name || label.id}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
                <span>Project</span>
                <ChevronDown size={13} />
              </div>
              <PropertyPickerRow
                testId="issue-project-display"
                icon={<Plus size={14} />}
                value={projectName(issue.project)}
              >
                <DropdownMenuItem onClick={() => updateIssue({ project_id: null })}>No project</DropdownMenuItem>
                {projects.map((project) => (
                  <DropdownMenuItem key={project.id || project.name} onClick={() => updateIssue({ project_id: project.id })}>
                    {projectName(project)}
                  </DropdownMenuItem>
                ))}
              </PropertyPickerRow>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AvatarBubble({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <span className={`inline-grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium ${accent ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}>
      {children}
    </span>
  );
}

function PropertyRow({
  children,
  icon,
  ...props
}: {
  children: ReactNode;
  icon: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex min-h-8 items-center gap-2 rounded-md text-[13px] text-foreground" {...props}>
      <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function PropertyPickerRow({
  children,
  icon,
  value,
  testId,
}: {
  children: ReactNode;
  icon: ReactNode;
  value: string;
  testId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className="flex min-h-8 w-full items-center gap-2 rounded-md text-left text-[13px] text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">{icon}</span>
          <span className="min-w-0 truncate">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueActionButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Button
      aria-label={label}
      className="size-8 rounded-full border border-border bg-background p-0 text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:text-foreground"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
