export interface LinearUser {
  id?: string;
  name?: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Team {
  id?: string;
  key?: string;
  name?: string;
}

export interface WorkflowState {
  id?: string;
  key?: string;
  name?: string;
  type?: string;
  color?: string;
  team_key?: string;
}

export interface Label {
  id?: string;
  name?: string;
  color?: string;
}

export interface Project {
  id?: string;
  key?: string;
  name?: string;
  title?: string;
  description?: string | null;
  status?: string;
  state?: string;
  lead?: LinearUser | string | null;
  target_date?: string | null;
  updated_at?: string | null;
  issues?: Issue[];
  updates?: ProjectUpdate[];
}

export interface Cycle {
  id?: string;
  key?: string;
  name?: string;
  number?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string;
  team_key?: string;
  issue_count?: number;
}

export interface ViewDefinition {
  id?: string;
  key?: string;
  name?: string;
  description?: string | null;
  team_key?: string | null;
  filters?: Record<string, unknown>;
}

export interface Comment {
  id?: string;
  body?: string;
  text?: string;
  content?: string;
  created_at?: string;
  author?: LinearUser | string | null;
}

export interface Relation {
  id?: string;
  type?: string;
  relation_type?: string;
  issue?: Issue;
  target_issue?: Issue;
  target_issue_key?: string;
  related_issue_key?: string;
}

export interface Issue {
  id?: string;
  key?: string;
  identifier?: string;
  issue_key?: string;
  title?: string;
  name?: string;
  description?: string | null;
  state?: WorkflowState | string | null;
  status?: string | null;
  workflow_state?: WorkflowState | string | null;
  priority?: string | number | null;
  estimate?: string | number | null;
  assignee?: LinearUser | string | null;
  assignee_id?: string | null;
  team?: Team | string | null;
  team_key?: string | null;
  project?: Project | string | null;
  project_id?: string | null;
  cycle?: Cycle | string | null;
  cycle_id?: string | null;
  due_date?: string | null;
  labels?: Label[] | string[] | null;
  comments?: Comment[];
  relations?: Relation[];
  subissues?: Issue[];
  children?: Issue[];
  parent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
}

export interface Notification {
  id?: string;
  title?: string;
  text?: string;
  body?: string;
  type?: string;
  read?: boolean;
  read_at?: string | null;
  issue?: Issue | string | null;
  created_at?: string | null;
}

export interface ProjectUpdate {
  id?: string;
  body?: string;
  text?: string;
  created_at?: string | null;
  author?: LinearUser | string | null;
}

export interface SearchResult {
  id?: string;
  type?: string;
  title?: string;
  name?: string;
  key?: string;
  url?: string;
  issue?: Issue;
  project?: Project;
}

export function issueKey(issue: Issue | null | undefined) {
  return issue?.key || issue?.identifier || issue?.issue_key || issue?.id || "ISSUE";
}

export function issueTitle(issue: Issue | null | undefined) {
  return issue?.title || issue?.name || "Untitled issue";
}

export function stateName(issue: Issue | null | undefined) {
  const state = issue?.state ?? issue?.workflow_state ?? issue?.status;
  if (!state) return "Backlog";
  if (typeof state === "string") return titleize(state);
  return state.name || state.key || "Backlog";
}

export function stateColor(value: string | undefined) {
  const key = (value || "").toLowerCase();
  if (key.includes("done") || key.includes("complete")) return "var(--success)";
  if (key.includes("progress") || key.includes("active") || key.includes("started")) return "var(--primary)";
  if (key.includes("triage") || key.includes("review")) return "var(--warning)";
  if (key.includes("cancel") || key.includes("blocked")) return "var(--danger)";
  return "var(--text-faint)";
}

export function assigneeName(issue: Issue | null | undefined) {
  const assignee = issue?.assignee;
  if (!assignee) return "Unassigned";
  if (typeof assignee === "string") return assignee;
  return assignee.name || assignee.full_name || assignee.display_name || assignee.username || "Unassigned";
}

export function userName(user: LinearUser | string | null | undefined) {
  if (!user) return "Unknown";
  if (typeof user === "string") return user;
  return user.name || user.full_name || user.display_name || user.username || user.email || "Unknown";
}

export function projectName(project: Project | string | null | undefined) {
  if (!project) return "No project";
  if (typeof project === "string") return project;
  return project.name || project.title || project.key || project.id || "Project";
}

export function teamKey(issue: Issue | null | undefined) {
  const team = issue?.team;
  if (typeof team === "string") return team;
  return issue?.team_key || team?.key || team?.id || "ENG";
}

export function projectTitle(project: Project | null | undefined) {
  return project?.name || project?.title || project?.key || project?.id || "Untitled project";
}

export function priorityLabel(priority: Issue["priority"]) {
  if (priority === undefined || priority === null || priority === "") return "No priority";
  const value = String(priority).toLowerCase();
  if (value === "0" || value === "none") return "No priority";
  if (value === "1" || value.includes("urgent")) return "Urgent";
  if (value === "2" || value.includes("high")) return "High";
  if (value === "3" || value.includes("medium")) return "Medium";
  if (value === "4" || value.includes("low")) return "Low";
  return titleize(value);
}

export function initials(name: string | null | undefined) {
  const cleaned = (name || "?").trim();
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function titleize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
