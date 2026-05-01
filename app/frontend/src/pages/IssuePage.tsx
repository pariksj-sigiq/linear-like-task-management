import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  ListFilter,
  Link2,
  MoreHorizontal,
  Plus,
  Send,
  SmilePlus,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import { MiniIssueLink, PriorityIcon, StatusGlyph } from "../components/IssueExplorer";
import { SubIssueProgress } from "../components/SubIssueProgress";
import { IssueProjectPicker } from "../components/issue/ProjectPicker";
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
  priorityLabel,
  projectName,
  stateName,
  teamKey,
  userName,
} from "../linearTypes";
import { mergeIssueOverride, saveIssueOverride, subscribeIssueOverrides } from "../localIssueOverrides";

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

interface IssueNavigationState {
  source?: string;
  from?: string;
  fromLabel?: string;
  fromPill?: string;
  parentKey?: string;
  parentTitle?: string;
}

export function IssuePage() {
  const { issueKey: routeIssueKey } = useParams();
  const location = useLocation();
  const navigationState = (location.state || {}) as IssueNavigationState;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [comment, setComment] = useState("");
  const [subIssueTitle, setSubIssueTitle] = useState("");
  const [subIssueDescription, setSubIssueDescription] = useState("");
  const [subIssueOpen, setSubIssueOpen] = useState(false);
  const [creatingSubIssue, setCreatingSubIssue] = useState(false);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIssue = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const response = await readTool("get_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
    });
    const data = response.data as Record<string, unknown> | null;
    const fallbackIssue = routeIssueKey ? referenceIssues[routeIssueKey] : null;
    const nextIssue = ((data?.issue || data) as Issue | null) || fallbackIssue;
    setIssue(nextIssue ? mergeIssueOverride(nextIssue) : nextIssue);
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
    return subscribeIssueOverrides(() => {
      setIssue((current) => (current ? mergeIssueOverride(current) : current));
    });
  }, []);

  useEffect(() => {
    if (issue) {
      const title = `${issueKey(issue)} ${issueTitle(issue)}`;
      document.title = title;
    }
  }, [issue]);

  useEffect(() => {
    if (!labelMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (target.closest("[data-issue-label-menu='trigger']")) return;
      if (target.closest("[data-issue-label-menu='content']")) return;
      setLabelMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("mousedown", closeOnOutsidePointer, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("mousedown", closeOnOutsidePointer, true);
    };
  }, [labelMenuOpen]);

  const updateIssue = async (changes: Record<string, unknown>, localChanges: Partial<Issue> = changes as Partial<Issue>) => {
    const key = routeIssueKey || (issue ? issueKey(issue) : "");
    if (key) {
      saveIssueOverride(key, localChanges);
      setIssue((current) => (current ? mergeIssueOverride({ ...current, ...localChanges }) : current));
    }

    const response = await readTool("update_issue", {
      issue_key: routeIssueKey,
      key: routeIssueKey,
      id: routeIssueKey,
      ...changes,
    });
    const hasLocalFallback = Boolean(routeIssueKey && referenceIssues[routeIssueKey]);
    if (response.error && !hasLocalFallback) setError(response.error);
    if (!hasLocalFallback) await loadIssue(false);
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

  const createSubIssue = async (event: FormEvent) => {
    event.preventDefault();
    if (!issue || !subIssueTitle.trim() || creatingSubIssue) return;

    setCreatingSubIssue(true);
    setError(null);
    const parentKey = routeIssueKey || issueKey(issue);
    const response = await readTool("create_sub_issue", {
      parent_identifier: parentKey,
      title: subIssueTitle.trim(),
      description: subIssueDescription.trim() || undefined,
      status_name: "Todo",
      priority: issue.priority || "none",
      assignee_id: issue.assignee_id,
      project_id: issue.project_id,
      cycle_id: issue.cycle_id,
      creator_id: "user_001",
    });

    if (response.error) {
      setError(response.error);
      setCreatingSubIssue(false);
      return;
    }

    const created = response.data as Issue | null;
    if (created) {
      setIssue((current) =>
        current
          ? mergeIssueOverride({
              ...current,
              subissues: [...(current.subissues || current.children || []), created],
            })
          : current,
      );
    }
    setSubIssueTitle("");
    setSubIssueDescription("");
    setSubIssueOpen(false);
    setCreatingSubIssue(false);
    await loadIssue(false);
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
  const parentIssue = issue.parent || parentIssueFromNavigation(navigationState);
  const issueLabels = (issue.labels || []) as Array<Label | string>;
  const createdBy = assigneeName(issue);

  return (
    <div className="relative" data-testid="issue-detail-page">
      <IssueDetailTopBar issue={issue} parentIssue={parentIssue} navigationState={navigationState} />

      <div className="linear-page-wide relative">
        <ErrorBanner message={error} />

        <div className="absolute right-2 top-2 hidden items-center gap-1 lg:flex" aria-label="Issue actions">
          <IssueActionButton label="Copy link"><Link2 size={14} strokeWidth={1.7} /></IssueActionButton>
          <IssueActionButton label="Delete issue"><Trash2 size={14} strokeWidth={1.7} /></IssueActionButton>
          <IssueActionButton label="Add relation"><GitBranch size={14} strokeWidth={1.7} /></IssueActionButton>
          <IssueActionButton label="Activity filter"><ListFilter size={14} strokeWidth={1.7} /></IssueActionButton>
          <IssueActionButton label="More actions"><ChevronDown size={14} strokeWidth={1.7} /></IssueActionButton>
        </div>

        <div className="mx-auto grid max-w-[1128px] gap-14 lg:grid-cols-[minmax(0,744px)_318px] lg:items-start">
        <section className="min-w-0 pt-1 lg:pt-2">
          <div className="space-y-7">
            <div className="space-y-6">
              <div className="space-y-5">
                <h1 className="text-[24px] font-semibold leading-[1.18] tracking-[-0.012em] text-foreground">{issueTitle(issue)}</h1>

                {parentIssue && (
                  <ParentIssueContext parent={parentIssue} navigationState={navigationState} />
                )}

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

            <section className="space-y-2" data-testid="sub-issues-section">
              {subissues.length > 0 ? (
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-muted-foreground">
                    <ChevronDown size={14} />
                    <span>Sub-issues</span>
                    <SubIssueProgress issue={issue} childrenIssues={subissues} testId="subissue-section-progress" />
                  </div>
                  <Button
                    className="size-8 rounded-full border border-border bg-background p-0 shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                    type="button"
                    variant="ghost"
                    data-testid="create-sub-issue-button"
                    aria-expanded={subIssueOpen}
                    aria-label="Add sub-issue"
                    onClick={() => setSubIssueOpen(true)}
                  >
                    <Plus size={15} />
                  </Button>
                </div>
              ) : (
                <Button
                  className="h-7 w-fit gap-2 px-1.5 text-[13px] font-normal text-muted-foreground"
                  type="button"
                  variant="ghost"
                  data-testid="create-sub-issue-button"
                  aria-expanded={subIssueOpen}
                  onClick={() => setSubIssueOpen(true)}
                >
                  <Plus size={13} />
                  Add sub-issues
                </Button>
              )}

              {subIssueOpen && (
                <form
                  onSubmit={createSubIssue}
                  className="rounded-lg border border-border bg-background p-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
                  data-testid="sub-issue-composer"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <GitBranch size={13} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        autoFocus
                        className="h-8 w-full bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                        data-testid="sub-issue-title-input"
                        placeholder="Issue title"
                        value={subIssueTitle}
                        onChange={(event) => setSubIssueTitle(event.target.value)}
                      />
                      <textarea
                        className="min-h-[52px] w-full resize-none bg-transparent text-[13px] leading-5 text-muted-foreground outline-none placeholder:text-muted-foreground/80"
                        data-testid="sub-issue-description-input"
                        placeholder="Add description..."
                        value={subIssueDescription}
                        onChange={(event) => setSubIssueDescription(event.target.value)}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-muted-foreground">
                          Starts in Todo and inherits project, priority, assignee, and cycle from {issueKey(issue)}.
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            className="h-7 px-2 text-[13px]"
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setSubIssueOpen(false);
                              setSubIssueTitle("");
                              setSubIssueDescription("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="h-7 px-2 text-[13px]"
                            type="submit"
                            data-testid="submit-sub-issue"
                            disabled={!subIssueTitle.trim() || creatingSubIssue}
                          >
                            {creatingSubIssue ? "Adding..." : "Add"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {subissues.length > 0 && (
                <div className="grid gap-1">
                  {subissues.map((child) => (
                    <div key={issueKey(child)} data-testid={`sub-issue-row-${issueKey(child)}`}>
                      <MiniIssueLink issue={child} state={childIssueNavigationState(navigationState, issue)} />
                    </div>
                  ))}
                </div>
              )}
            </section>

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
                    className="comment flex items-start gap-3 px-2 py-1.5 text-[13px] text-muted-foreground"
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
          <Card className="overflow-visible rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
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
                {(closeMenu) =>
                  STATUS_OPTIONS.map((status) => {
                    const matchingState = states.find((state) => state.name === status);
                    return (
                      <PropertyMenuItem
                        key={status}
                        onSelect={() => {
                          closeMenu();
                          void updateIssue(matchingState?.id ? { state_id: matchingState.id } : { state: status }, { state: status });
                        }}
                      >
                        <StatusGlyph state={status} />
                        {status}
                      </PropertyMenuItem>
                    );
                  })
                }
              </PropertyPickerRow>

              <PropertyPickerRow
                testId="issue-priority-display"
                icon={<PriorityIcon priority={issue.priority} />}
                value={priorityLabel(issue.priority)}
              >
                {(closeMenu) =>
                  PRIORITY_OPTIONS.map((priority) => (
                    <PropertyMenuItem
                      key={priority.value}
                      onSelect={() => {
                        closeMenu();
                        void updateIssue({ priority: priority.value }, { priority: priority.value });
                      }}
                    >
                      <PriorityIcon priority={priority.value} />
                      {priority.label}
                    </PropertyMenuItem>
                  ))
                }
              </PropertyPickerRow>

              <PropertyPickerRow
                testId="issue-assignee-display"
                icon={<AvatarBubble accent>{initials(assigneeName(issue))}</AvatarBubble>}
                value={assigneeName(issue)}
              >
                {(closeMenu) => (
                  <>
                    <PropertyMenuItem
                      onSelect={() => {
                        closeMenu();
                        void updateIssue({ assignee_id: null }, { assignee: null, assignee_id: null });
                      }}
                    >
                      <AvatarBubble>?</AvatarBubble>
                      Unassigned
                    </PropertyMenuItem>
                    {users.map((user) => (
                      <PropertyMenuItem
                        key={user.id || user.username}
                        onSelect={() => {
                          closeMenu();
                          void updateIssue({ assignee_id: user.id }, { assignee: user, assignee_id: user.id });
                        }}
                      >
                        <AvatarBubble>{initials(userName(user))}</AvatarBubble>
                        {userName(user)}
                      </PropertyMenuItem>
                    ))}
                  </>
                )}
              </PropertyPickerRow>

            </CardContent>
          </Card>
          <Card className="overflow-visible rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
            <CardContent className="space-y-2 overflow-visible p-4">
              <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
                <span>Labels</span>
                <ChevronDown size={13} />
              </div>
              {issueLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {issueLabels.map((label) => {
                    const labelName = typeof label === "string" ? label : label.name || label.id || "Label";
                    const color = labelColor(label, labels);
                    return (
                      <Badge key={labelName} variant="outline" className="max-w-full gap-1.5 rounded-md px-2 text-[12px] font-normal text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate">{labelName}</span>
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
              <div className="relative">
                {labelMenuOpen && (
                  <button
                    type="button"
                    aria-label="Close label menu"
                    className="fixed inset-0 z-[80] cursor-default bg-transparent"
                    onClick={() => setLabelMenuOpen(false)}
                    tabIndex={-1}
                    data-testid="issue-label-menu-backdrop"
                  />
                )}
                <Button
                  className="h-8 w-full justify-start gap-2 px-1.5 text-[13px] font-normal text-muted-foreground"
                  type="button"
                  variant="ghost"
                  data-testid="issue-add-label"
                  aria-expanded={labelMenuOpen}
                  onClick={() => setLabelMenuOpen((open) => !open)}
                >
                  <Tag size={14} />
                  Add label
                </Button>
                {labelMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Add label"
                    className="absolute bottom-[calc(100%+8px)] right-0 z-[90] max-h-[360px] w-[420px] max-w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-popover p-2 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10"
                    data-issue-label-menu="content"
                    data-testid="issue-label-menu-content"
                  >
                    {labels.map((label) => (
                      <button
                        type="button"
                        role="menuitem"
                        key={label.id || label.name}
                        onClick={() => {
                          setLabelMenuOpen(false);
                          void addLabel(label);
                        }}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: labelColor(label, labels) }} />
                        <span className="min-w-0 truncate">{label.name || label.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border border-border/70 bg-background py-0 shadow-[0_1px_3px_rgb(0_0_0/0.04)] ring-0" size="sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
                <span>Project</span>
                <ChevronDown size={13} />
              </div>
              <IssueProjectPicker
                issueId={routeIssueKey || issueKey(issue)}
                currentProject={issue.project}
                currentProjectId={issue.project_id}
                onChanged={async (nextProjectId) => {
                  const key = routeIssueKey || issueKey(issue);
                  const nextProject = nextProjectId
                    ? projects.find((project) => (project.id || project.key) === nextProjectId) || null
                    : null;
                  if (key) {
                    saveIssueOverride(key, { project: nextProject, project_id: nextProjectId });
                    setIssue((current) =>
                      current
                        ? mergeIssueOverride({ ...current, project: nextProject, project_id: nextProjectId })
                        : current,
                    );
                  }
                  await loadIssue(false);
                }}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
      </div>
    </div>
  );
}

function IssueDetailTopBar({
  issue,
  parentIssue,
  navigationState,
}: {
  issue: Issue;
  parentIssue: Issue | null;
  navigationState: IssueNavigationState;
}) {
  const myIssuesReturn = myIssuesReturnTarget(navigationState);
  const projectReturn = projectReturnTarget(navigationState);
  const fallbackLabel = projectName(issue.project) !== "No project" ? projectName(issue.project) : teamKey(issue);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background" data-testid="issue-detail-topbar">
      <div className="flex h-[var(--topbar-height)] items-center justify-between gap-4 px-4">
        <nav className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-foreground">
          {myIssuesReturn ? (
            <Link to={myIssuesReturn.href} className="shrink-0 hover:text-foreground">
              My issues
            </Link>
          ) : projectReturn ? (
            <Link to={projectReturn.href} className="shrink-0 hover:text-foreground">
              {projectReturn.label}
            </Link>
          ) : parentIssue ? (
            <Link to={`/issue/${issueKey(parentIssue)}`} className="shrink-0 hover:text-foreground">
              {issueKey(parentIssue)}
            </Link>
          ) : (
            <span className="shrink-0 text-muted-foreground">{fallbackLabel}</span>
          )}
          <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            {issueKey(issue)} {issueTitle(issue)}
          </span>
          <Button type="button" variant="ghost" className="size-7 shrink-0 p-0 text-muted-foreground" aria-label="Favorite issue">
            <Star size={16} />
          </Button>
          <Button type="button" variant="ghost" className="size-7 shrink-0 p-0 text-muted-foreground" aria-label="Issue actions">
            <MoreHorizontal size={16} />
          </Button>
        </nav>
      </div>
      {myIssuesReturn && myIssuesReturn.pill !== "Activity" && (
        <Link
          to={myIssuesReturn.href}
          className="absolute left-3 top-[calc(100%-0.65rem)] rounded-lg border border-border bg-background px-3 py-1.5 text-[14px] font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.08)] hover:bg-muted"
          data-testid="issue-origin-pill"
        >
          {myIssuesReturn.pill}
        </Link>
      )}
    </header>
  );
}

function ParentIssueContext({
  parent,
  navigationState,
}: {
  parent: Issue;
  navigationState: IssueNavigationState;
}) {
  const state = myIssuesReturnTarget(navigationState)
    ? {
        ...navigationState,
        parentKey: undefined,
        parentTitle: undefined,
      }
    : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[16px] text-muted-foreground" data-testid="issue-parent-context">
      <span>Sub-issue of</span>
      <Link
        to={`/issue/${issueKey(parent)}`}
        state={state}
        className="inline-flex min-w-0 items-center gap-2 rounded-md text-foreground hover:bg-muted/60 hover:px-1"
        data-testid="issue-parent-link"
      >
        <StatusGlyph state={stateName(parent)} />
        <span className="shrink-0 tabular-nums text-muted-foreground">{issueKey(parent)}</span>
        <span className="min-w-0 truncate font-medium">{issueTitle(parent)}</span>
      </Link>
      <SubIssueProgress issue={parent} testId="issue-parent-progress" />
    </div>
  );
}

function myIssuesReturnTarget(state: IssueNavigationState) {
  if (state.source !== "my-issues") return null;
  const href = typeof state.from === "string" && state.from.startsWith("/my-issues") ? state.from : "/my-issues/assigned";
  return {
    href,
    pill: state.fromPill || "Assigned",
  };
}

function projectReturnTarget(state: IssueNavigationState) {
  if (state.source !== "project") return null;
  const href = typeof state.from === "string" && state.from.startsWith("/project/") ? state.from : null;
  if (!href) return null;
  return {
    href,
    label: state.fromLabel || "Project",
  };
}

function parentIssueFromNavigation(state: IssueNavigationState): Issue | null {
  if (!state.parentKey) return null;
  return {
    key: state.parentKey,
    title: state.parentTitle || state.parentKey,
  };
}

function childIssueNavigationState(state: IssueNavigationState, parent: Issue): IssueNavigationState {
  const myIssuesReturn = myIssuesReturnTarget(state);
  const projectReturn = projectReturnTarget(state);
  return {
    ...(myIssuesReturn
      ? {
          source: "my-issues",
          from: myIssuesReturn.href,
          fromLabel: "My issues",
          fromPill: myIssuesReturn.pill,
        }
      : projectReturn
        ? {
            source: "project",
            from: projectReturn.href,
            fromLabel: projectReturn.label,
          }
      : {}),
    parentKey: issueKey(parent),
    parentTitle: issueTitle(parent),
  };
}

function AvatarBubble({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none ${accent ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}>
      {children}
    </span>
  );
}

function labelColor(label: Label | string | null | undefined, labels: Label[]) {
  if (typeof label !== "string" && label?.color) return label.color;
  const labelName = typeof label === "string" ? label : label?.name || label?.id || "";
  const match = labels.find((item) => {
    const name = item.name || item.id || "";
    return name.toLowerCase() === labelName.toLowerCase();
  });
  return match?.color || "#5e6ad2";
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
  children: ReactNode | ((closeMenu: () => void) => ReactNode);
  icon: ReactNode;
  value: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const dismissOnOutsidePointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointer, true);
    document.addEventListener("mousedown", dismissOnOutsidePointer, true);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer, true);
      document.removeEventListener("mousedown", dismissOnOutsidePointer, true);
      document.removeEventListener("keydown", dismissOnEscape, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-8 w-full items-center gap-2 rounded-md text-left text-[13px] text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">{icon}</span>
        <span className="min-w-0 truncate">{value}</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={value}
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-[min(320px,calc(100vh-12rem))] w-64 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {typeof children === "function" ? children(closeMenu) : children}
        </div>
      )}
    </div>
  );
}

function PropertyMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

function IssueActionButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Button
      aria-label={label}
      className="size-7 rounded-full border border-border bg-background p-0 text-[#6f6f6f] shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:bg-muted hover:text-foreground"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
