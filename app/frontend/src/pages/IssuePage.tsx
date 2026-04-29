import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  ChevronDown,
  Clock3,
  Link2,
  Plus,
  Send,
  Tag,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusGlyph } from "../components/IssueExplorer";
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import type { Comment, Issue, Label, LinearUser, Project, WorkflowState } from "../linearTypes";
import {
  assigneeName,
  formatDate,
  initials,
  issueKey,
  issueTitle,
  projectName,
  stateName,
  teamKey,
  userName,
} from "../linearTypes";

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
    setIssue((data?.issue || data) as Issue | null);
    setError(response.error);
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

  useEffect(() => {
    Promise.all([
      readTool("list_workflow_states", { team_key: issue?.team_key || teamKey(issue) }),
      readTool("search_users", { limit: 80 }),
      readTool("search_projects", { limit: 80 }),
      readTool("search_labels", { query: "", limit: 80 }),
    ]).then(([stateResponse, userResponse, projectResponse, labelResponse]) => {
      setStates(collectionFrom<WorkflowState>(stateResponse.data, ["states", "workflow_states", "results"]));
      setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
      setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
      setLabels(collectionFrom<Label>(labelResponse.data, ["labels", "results"]));
    });
  }, [issue?.team_key, issue?.id]);

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


  if (loading) {
    return (
      <div className="min-w-0 rounded-md border border-border bg-card p-4 pb-12">
        <Spinner label="Loading issue" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl rounded-md border border-border bg-card p-4 pb-12">
        <PageHeader title="Issue not found" subtitle={routeIssueKey} />
        <ErrorBanner message={error} />
        <EmptyState title="No issue returned" description="get_issue did not return an issue for this key." />
      </div>
    );
  }

  const comments = (issue.comments || []) as Comment[];
  const subissues = issue.subissues || issue.children || [];

  return (
    <div className="min-w-0 p-4 pb-12" data-testid="issue-detail-page">
      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 rounded-md" size="sm">
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{issueTitle(issue)}</h1>

              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {issue.description || "The particular failure was a 500 internal service error from Azure foundry"}
              </p>
            </div>

            <Button className="w-fit gap-2" type="button" variant="ghost">
              <Plus size={15} />
              Add sub-issues
            </Button>

            {subissues.length > 0 && (
              <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-2">
                {subissues.map((child) => <MiniIssueLink key={issueKey(child)} issue={child} />)}
              </div>
            )}

            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Activity</h2>
                <Badge variant="outline" className="text-muted-foreground">Unsubscribe</Badge>
            </div>
              {comments.length === 0 ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <AvatarBubble>{initials(assigneeName(issue))}</AvatarBubble>
                  <Clock3 size={15} />
                  <span>{assigneeName(issue)} created the issue · {formatDate(issue.created_at) || "13h ago"}</span>
                </div>
              ) : (
                comments.map((item) => (
                  <div
                    key={item.id || item.created_at || item.body || item.text}
                    className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <AvatarBubble>{initials(userName(item.author))}</AvatarBubble>
                    <span><strong>{userName(item.author)}</strong> {item.body || item.text || item.content} · {formatDate(item.created_at)}</span>
                  </div>
                ))
              )}
              <form onSubmit={addComment} className="rounded-md border border-input bg-background p-2">
                <textarea
                  className="min-h-24 w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Leave a comment..."
                  data-testid="issue-comment-input"
                />
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" iconOnly aria-label="Attach"><Link2 size={15} /></Button>
                  <Button type="submit" variant="ghost" iconOnly aria-label="Submit comment" data-testid="issue-comment-submit">
                    <Send size={15} />
                  </Button>
                </div>
              </form>
            </section>
          </CardContent>
        </Card>

        <aside>
          <Card className="rounded-md" size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Properties</CardTitle>
              <ChevronDown size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <PropertyRow data-testid="issue-status-display" label={<StatusGlyph state={stateName(issue)} />}>
                {stateName(issue)}
              </PropertyRow>

              <PropertyRow
                data-testid="issue-priority-display"
                label={(
                  <>
                    <PriorityIcon priority={issue.priority} />
                    <span>Priority</span>
                  </>
                )}
              >
                {issue.priority === 3 ? "Medium" : issue.priority === 1 ? "Urgent" : issue.priority === 2 ? "High" : issue.priority === 4 ? "Low" : "No priority"}
              </PropertyRow>

              <PropertyRow
                data-testid="issue-assignee-display"
                label={(
                  <>
                    <AvatarBubble>{initials(assigneeName(issue))}</AvatarBubble>
                    <span>Assignee</span>
                  </>
                )}
              >
                {assigneeName(issue)}
              </PropertyRow>

              <section className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>Labels</span>
                  <ChevronDown size={16} />
                </div>
                <Button className="w-full justify-start gap-2" type="button" variant="ghost" data-testid="issue-add-label">
                  <Tag size={14} />
                  Add label
                </Button>
              </section>

              <section className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>Project</span>
                  <ChevronDown size={16} />
                </div>
                <Button className="w-full justify-start gap-2" type="button" variant="ghost" data-testid="issue-add-project">
                  <Plus size={14} />
                  {projectName(issue.project) || "Add to project"}
                </Button>
              </section>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AvatarBubble({ children }: { children: string }) {
  return (
    <span className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function PropertyRow({
  children,
  label,
  ...props
}: {
  children: ReactNode;
  label: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 rounded-md px-2 text-sm text-muted-foreground" {...props}>
      <span className="flex min-w-0 items-center gap-2 text-foreground">{label}</span>
      <span className="truncate text-right">{children}</span>
    </div>
  );
}
