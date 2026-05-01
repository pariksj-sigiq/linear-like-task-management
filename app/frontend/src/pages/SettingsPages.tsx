import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Check,
  CircleDot,
  Copy,
  CreditCard,
  FileText,
  Flame,
  Gauge,
  Globe2,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Palette,
  Plug,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Tags,
  User,
  UsersRound,
  Workflow,
} from "lucide-react";
import { callTool, collectionFrom, readTool } from "../api";
import { useAuth } from "../auth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { Label, LinearUser, Team, WorkflowState } from "../linearTypes";
import {
  PREFERENCE_EVENT,
  applyUserPreferences,
  defaultPreferences,
  normalizePreferences,
  type UserPreferences,
} from "../preferences";

type SettingsSection = {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  group?: string;
};

type Workspace = {
  id?: string;
  name?: string;
  url_key?: string;
};

type Template = {
  id?: string;
  name?: string;
  team_id?: string;
  payload_json?: Record<string, unknown>;
};

type ProjectStatus = {
  id?: string;
  name?: string;
  category?: string;
  color?: string;
  position?: number;
  is_default?: boolean;
};

type ApiKey = {
  id?: string;
  workspace_id?: string;
  name?: string;
  token_prefix?: string;
  scopes?: string;
  agent_name?: string | null;
  created_by_name?: string | null;
  workspace_name?: string | null;
  created_at?: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
};

type SettingAction = {
  id?: string;
  page_key?: string;
  action?: string;
  value?: string | null;
  created_at?: string;
};

type SettingsData = {
  preferences: UserPreferences;
  users: LinearUser[];
  teams: Team[];
  labels: Label[];
  templates: Template[];
  workflowStates: WorkflowState[];
  projectStatuses: ProjectStatus[];
  workspaces: Workspace[];
  apiKeys: ApiKey[];
  settingActions: SettingAction[];
};

const settingsSections: SettingsSection[] = [
  { key: "preferences", label: "Preferences", path: "/settings/account/preferences", icon: <SlidersHorizontal size={16} /> },
  { key: "profile", label: "Profile", path: "/settings/account/profile", icon: <User size={16} /> },
  { key: "notifications", label: "Notifications", path: "/settings/account/notifications", icon: <Bell size={16} /> },
  { key: "security", label: "Security & access", path: "/settings/account/security", icon: <ShieldCheck size={16} /> },
  { key: "connected-accounts", label: "Connected accounts", path: "/settings/account/connections", icon: <Plug size={16} /> },
  { key: "agent-personalization", label: "Agent personalization", path: "/settings/account/agents", icon: <Bot size={16} /> },
  { key: "issue-labels", label: "Labels", path: "/settings/issue-labels", icon: <Tags size={16} />, group: "Issues" },
  { key: "issue-templates", label: "Templates", path: "/settings/issue-templates", icon: <FileText size={16} />, group: "Issues" },
  { key: "slas", label: "SLAs", path: "/settings/sla", icon: <Flame size={16} />, group: "Issues" },
  { key: "project-labels", label: "Labels", path: "/settings/project-labels", icon: <Tags size={16} />, group: "Projects" },
  { key: "project-templates", label: "Templates", path: "/settings/project-templates", icon: <FileText size={16} />, group: "Projects" },
  { key: "statuses", label: "Statuses", path: "/settings/project-statuses", icon: <Boxes size={16} />, group: "Projects" },
  { key: "updates", label: "Updates", path: "/settings/project-updates", icon: <RotateCcw size={16} />, group: "Projects" },
  { key: "ai-agents", label: "AI & Agents", path: "/settings/ai", icon: <Sparkles size={16} />, group: "Features" },
  { key: "initiatives", label: "Initiatives", path: "/settings/initiatives", icon: <Gauge size={16} />, group: "Features" },
  { key: "documents", label: "Documents", path: "/settings/documents", icon: <FileText size={16} />, group: "Features" },
  { key: "customer-requests", label: "Customer requests", path: "/settings/customer-requests", icon: <BriefcaseBusiness size={16} />, group: "Features" },
  { key: "pulse", label: "Pulse", path: "/settings/pulse", icon: <Workflow size={16} />, group: "Features" },
  { key: "asks", label: "Asks", path: "/settings/asks", icon: <MessageSquare size={16} />, group: "Features" },
  { key: "emojis", label: "Emojis", path: "/settings/emojis", icon: <Smile size={16} />, group: "Features" },
  { key: "integrations", label: "Integrations", path: "/settings/integrations", icon: <Plug size={16} />, group: "Features" },
  { key: "workspace", label: "Workspace", path: "/settings/workspace", icon: <Globe2 size={16} />, group: "Administration" },
  { key: "teams", label: "Teams", path: "/settings/teams", icon: <Palette size={16} />, group: "Administration" },
  { key: "members", label: "Members", path: "/settings/members", icon: <UsersRound size={16} />, group: "Administration" },
  { key: "admin-security", label: "Security", path: "/settings/security", icon: <LockKeyhole size={16} />, group: "Administration" },
  { key: "api", label: "API", path: "/settings/api", icon: <KeyRound size={16} />, group: "Administration" },
  { key: "plans", label: "Billing", path: "/settings/billing", icon: <CreditCard size={16} />, group: "Administration" },
];

const preferenceOptions = {
  default_home_view: ["Active issues", "My issues", "Inbox", "Projects", "Roadmap"],
  display_names: ["Full name", "First name", "Username"],
  first_day_of_week: ["Sunday", "Monday", "Saturday"],
  send_comment_shortcut: ["⌘+Enter", "Enter", "Ctrl+Enter"],
  font_size: ["Default", "Small", "Large"],
  theme: ["System", "Light", "Dark"],
};

export function SettingsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const activeKey = getActiveKey(location.pathname);
  const activeSection = settingsSections.find((section) => section.key === activeKey) || settingsSections[0];
  const currentUserId = user?.id && user.id !== "dev-admin" ? user.id : "user_001";
  const [data, setData] = useState<SettingsData>({
    preferences: defaultPreferences,
    users: [],
    teams: [],
    labels: [],
    templates: [],
    workflowStates: [],
    projectStatuses: [],
    workspaces: [],
    apiKeys: [],
    settingActions: [],
  });
  const [status, setStatus] = useState<string | null>(null);

  useDocumentTitle(`${activeSection.label} - Settings`);

  const refresh = async () => {
    const [preferences, users, teams, labels, templates, workflowStates, projectStatuses, workspaces, apiKeys, settingActions] = await Promise.all([
      readTool<{ preferences?: unknown }>("get_user_preferences", { id: currentUserId }),
      readTool("search_users", { limit: 80 }),
      readTool("search_teams", { limit: 40 }),
      readTool("search_labels", { limit: 100 }),
      readTool("list_templates", { limit: 100 }),
      readTool("list_workflow_states", { limit: 100 }),
      readTool("list_project_statuses", { limit: 80 }),
      readTool("search_workspaces", { limit: 20 }),
      readTool("list_api_keys", { limit: 100 }),
      readTool("list_setting_actions", { limit: 250 }),
    ]);

    const nextPreferences = normalizePreferences(preferences.data?.preferences);
    setData({
      preferences: nextPreferences,
      users: collectionFrom<LinearUser>(users.data, ["users", "results"]),
      teams: collectionFrom<Team>(teams.data, ["teams", "results"]),
      labels: collectionFrom<Label>(labels.data, ["labels", "results"]),
      templates: collectionFrom<Template>(templates.data, ["templates", "results"]),
      workflowStates: collectionFrom<WorkflowState>(workflowStates.data, ["states", "workflow_states", "results"]),
      projectStatuses: collectionFrom<ProjectStatus>(projectStatuses.data, ["project_statuses", "results"]),
      workspaces: collectionFrom<Workspace>(workspaces.data, ["workspaces", "results"]),
      apiKeys: collectionFrom<ApiKey>(apiKeys.data, ["api_keys", "results"]),
      settingActions: collectionFrom<SettingAction>(settingActions.data, ["settings_actions", "results"]),
    });
    applyUserPreferences(nextPreferences);
  };

  useEffect(() => {
    refresh();
  }, [currentUserId]);

  const updatePreference = async (patch: Partial<UserPreferences>) => {
    const optimistic = normalizePreferences({ ...data.preferences, ...patch, user_id: currentUserId });
    setData((current) => ({ ...current, preferences: optimistic }));
    applyUserPreferences(optimistic);
    window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: optimistic }));
    const response = await readTool<{ preferences?: unknown }>("update_user_preferences", { user_id: currentUserId, ...patch });
    if (response.data?.preferences) {
      const saved = normalizePreferences(response.data.preferences);
      setData((current) => ({ ...current, preferences: saved }));
      applyUserPreferences(saved);
      window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: saved }));
      setStatus("Preferences saved to the workspace database.");
    } else if (response.error) {
      setStatus(response.error);
    }
  };

  const mutate = async (label: string, fn: () => Promise<unknown>) => {
    setStatus(null);
    await fn();
    await refresh();
    if (label) setStatus(label);
  };

  return (
    <div className="relative flex min-h-svh min-w-0 bg-sidebar text-foreground" data-testid="settings-page">
      <aside className="flex w-[245px] shrink-0 flex-col bg-sidebar px-4 py-5 max-[900px]:w-[220px] max-[900px]:px-3" data-testid="settings-sidebar">
        <Link to="/my-issues/activity" className="mb-5 flex h-8 items-center gap-2 rounded-md px-2 text-[14px] font-normal text-[#60636b] hover:bg-muted hover:text-[#24262b]" data-testid="settings-back-to-app">
          <ArrowLeft size={16} strokeWidth={2.2} />
          Back to app
        </Link>
        <SettingsNav activeKey={activeKey} />
        <div className="mt-auto flex items-center gap-2 pt-5">
          <button className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground" type="button" aria-label="Help">
            <HelpCircle size={16} />
          </button>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">Free plan</span>
        </div>
      </aside>
      <main className="my-3 mr-3 min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-background pb-16 shadow-[0_1px_2px_rgba(15,15,15,0.04)] max-[900px]:mr-0 max-[900px]:rounded-none max-[900px]:border-r-0">
        <div className={`mx-auto w-full px-5 max-[900px]:px-6 max-[700px]:px-4 ${activeKey === "api" ? "max-w-[640px] pt-[22px] max-[900px]:pt-7" : "max-w-[640px] pt-[68px] max-[900px]:pt-9"}`}>
          {status && <div className="mb-5 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground" data-testid="settings-status">{status}</div>}
          {renderSettingsContent(activeKey, data, user || null, updatePreference, mutate)}
        </div>
      </main>
      <div className="pointer-events-none fixed bottom-3 right-5 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 shadow-sm">
          <MessageSquare size={14} />
          Ask Linear
        </span>
        <span className="pointer-events-auto grid size-7 place-items-center rounded-full border border-border bg-background shadow-sm">
          <RotateCcw size={14} />
        </span>
      </div>
    </div>
  );
}

function renderSettingsContent(
  activeKey: string,
  data: SettingsData,
  user: LinearUser | null,
  updatePreference: (patch: Partial<UserPreferences>) => Promise<void>,
  mutate: (label: string, fn: () => Promise<unknown>) => Promise<void>,
) {
  if (activeKey === "preferences") return <PreferencesContent preferences={data.preferences} workspaces={data.workspaces} updatePreference={updatePreference} />;
  if (activeKey === "profile") return <ProfileContent user={user} mutate={mutate} />;
  if (activeKey === "members") return <MembersContent users={data.users} teams={data.teams} mutate={mutate} />;
  if (activeKey === "workspace") return <WorkspaceContent workspaces={data.workspaces} mutate={mutate} />;
  if (activeKey === "teams") return <TeamWorkflowContent teams={data.teams} workflowStates={data.workflowStates} mutate={mutate} />;
  if (activeKey === "statuses") return <ProjectStatusesContent statuses={data.projectStatuses} workspaces={data.workspaces} mutate={mutate} />;
  if (activeKey === "issue-labels" || activeKey === "project-labels") return <LabelsContent labels={data.labels} teams={data.teams} mutate={mutate} title={activeKey === "issue-labels" ? "Issue labels" : "Project labels"} />;
  if (activeKey === "issue-templates" || activeKey === "project-templates") return <TemplatesContent templates={data.templates} teams={data.teams} mutate={mutate} title={activeKey === "issue-templates" ? "Issue templates" : "Project templates"} />;
  if (activeKey === "notifications") return <NotificationContent preferences={data.preferences} updatePreference={updatePreference} />;
  if (activeKey === "api") return <ApiAccessContent apiKeys={data.apiKeys} workspaces={data.workspaces} settingActions={data.settingActions} mutate={mutate} />;
  if (activeKey === "ai-agents") return <AiAgentsContent apiKeys={data.apiKeys} workspaces={data.workspaces} mutate={mutate} />;
  return <SettingsStub section={settingsSections.find((section) => section.key === activeKey) || settingsSections[0]} settingActions={data.settingActions} mutate={mutate} />;
}

function SettingsNav({ activeKey }: { activeKey: string }) {
  const navRef = useRef<HTMLElement | null>(null);
  const grouped = useMemo(() => {
    const groups: Array<{ label: string | null; items: SettingsSection[] }> = [];
    for (const section of settingsSections) {
      const label = section.group || null;
      const existing = groups.find((group) => group.label === label);
      if (existing) existing.items.push(section);
      else groups.push({ label, items: [section] });
    }
    return groups;
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector(`[data-settings-key="${activeKey}"]`) as HTMLElement | null;
    if (!nav || !active) return;
    nav.scrollTop = Math.max(0, active.offsetTop - nav.clientHeight * 0.6);
  }, [activeKey]);

  return (
    <nav ref={navRef} className="min-h-0 flex-1 overflow-auto pr-0.5" aria-label="Settings navigation">
      {grouped.map((group) => (
        <div className={group.label ? "mt-6" : ""} key={group.label || "personal"}>
          {group.label && <p className="mb-2 px-2 text-[14px] font-normal text-[#666971]">{group.label}</p>}
          <div className="space-y-0.5">
            {group.items.map((section) => (
              <NavLink
                className={({ isActive }) =>
                  `flex h-8 items-center gap-2 rounded-md px-2 text-[14px] transition-colors ${
                    isActive || activeKey === section.key
                      ? "bg-[#e7e7e8] font-medium text-[#24262b]"
                      : "font-normal text-[#60636b] hover:bg-[#e7e7e8]/80 hover:text-[#24262b]"
                  }`
                }
                data-testid={`settings-nav-${section.key}`}
                data-settings-key={section.key}
                key={section.key}
                to={section.path}
              >
                <span className="text-current [&_svg]:size-[17px] [&_svg]:stroke-[2.35]">{section.icon}</span>
                <span className="truncate">{section.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function PreferencesContent({ preferences, workspaces, updatePreference }: { preferences: UserPreferences; workspaces: Workspace[]; updatePreference: (patch: Partial<UserPreferences>) => Promise<void> }) {
  return (
    <div data-testid="settings-preferences-page">
      <SettingsTitle title="Preferences" />
      <SettingsSection title="General">
        <SettingRow title="Default home view" description="Select which view to display when launching Linear">
          <SelectPill value={preferences.default_home_view} options={preferenceOptions.default_home_view} onChange={(value) => updatePreference({ default_home_view: value })} testId="preference-default-home" />
        </SettingRow>
        <SettingRow title="Display names" description="Select how names are displayed in the Linear interface">
          <SelectPill value={preferences.display_names} options={preferenceOptions.display_names} onChange={(value) => updatePreference({ display_names: value })} testId="preference-display-names" />
        </SettingRow>
        <SettingRow title="First day of the week" description="Used for date pickers">
          <SelectPill value={preferences.first_day_of_week} options={preferenceOptions.first_day_of_week} onChange={(value) => updatePreference({ first_day_of_week: value })} testId="preference-first-day" />
        </SettingRow>
        <SettingRow title="Convert text emoticons into emojis" description="Strings like :) will be converted to smileys">
          <ToggleSwitch checked={preferences.convert_emoticons} onClick={() => updatePreference({ convert_emoticons: !preferences.convert_emoticons })} testId="preference-emoticons" />
        </SettingRow>
        <SettingRow title="Send comment on..." description="Choose which key press is used to submit a comment">
          <SelectPill value={preferences.send_comment_shortcut} options={preferenceOptions.send_comment_shortcut} onChange={(value) => updatePreference({ send_comment_shortcut: value })} testId="preference-submit-comment" />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Interface and theme">
        <SettingRow title="Font size" description="Adjust the size of text across the app">
          <SelectPill value={preferences.font_size} options={preferenceOptions.font_size} onChange={(value) => updatePreference({ font_size: value })} testId="preference-font-size" />
        </SettingRow>
        <SettingRow title="Theme" description="Choose how Linear should appear on this device">
          <SelectPill value={preferences.theme} options={preferenceOptions.theme} onChange={(value) => updatePreference({ theme: value })} testId="preference-theme" />
        </SettingRow>
        <SettingRow title="Use pointer cursors" description="Change the cursor to a pointer when hovering over interactive elements">
          <ToggleSwitch checked={preferences.use_pointer_cursors} onClick={() => updatePreference({ use_pointer_cursors: !preferences.use_pointer_cursors })} testId="preference-pointer-cursors" />
        </SettingRow>
        <SettingRow title="Compact issue rows" description="Reduce vertical spacing in issue lists, boards, and inbox rows">
          <ToggleSwitch checked={preferences.compact_issue_rows} onClick={() => updatePreference({ compact_issue_rows: !preferences.compact_issue_rows })} testId="preference-compact-rows" />
        </SettingRow>
        <SettingRow title="Sidebar issue counts" description="Show unread and assigned counts next to workspace navigation items">
          <ToggleSwitch checked={preferences.sidebar_counts} onClick={() => updatePreference({ sidebar_counts: !preferences.sidebar_counts })} testId="preference-sidebar-counts" />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Desktop">
        <SettingRow title="Open Linear at login" description="Launch the desktop app when this device starts">
          <ToggleSwitch checked={preferences.open_at_login} onClick={() => updatePreference({ open_at_login: !preferences.open_at_login })} testId="preference-open-at-login" />
        </SettingRow>
        <SettingRow title="Default workspace" description="Workspace opened by desktop quick actions and new issue shortcuts">
          <SelectPill value={preferences.default_workspace_id || workspaces[0]?.id || ""} options={workspaces.map((workspace) => workspace.id || "").filter(Boolean)} labels={Object.fromEntries(workspaces.map((workspace) => [workspace.id || "", workspace.name || workspace.url_key || "Workspace"]))} onChange={(value) => updatePreference({ default_workspace_id: value })} testId="preference-default-workspace" />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

function ProfileContent({ user, mutate }: { user: LinearUser | null; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    id: user?.id && user.id !== "dev-admin" ? user.id : "user_001",
    full_name: user?.full_name || "System Administrator",
    username: user?.username || "admin",
    email: user?.email || "admin@example.com",
  });

  return (
    <div data-testid="settings-profile-page">
      <SettingsTitle title="Profile" description="Profile changes update the same user row used by login, assignment, comments, and project updates." />
      <SettingsSection title="Personal information">
        <InlineForm
          fields={[
            ["full_name", "Full name"],
            ["username", "Username"],
            ["email", "Email"],
          ]}
          form={form}
          setForm={setForm}
          submitLabel="Save profile"
          onSubmit={() => mutate("Profile saved to users.", () => callTool("update_user", form))}
        />
      </SettingsSection>
    </div>
  );
}

function NotificationContent({ preferences, updatePreference }: { preferences: UserPreferences; updatePreference: (patch: Partial<UserPreferences>) => Promise<void> }) {
  return (
    <div data-testid="settings-notifications-page">
      <SettingsTitle title="Notifications" description="Notification controls reuse account preferences so they persist and can be reflected by the inbox surface." />
      <SettingsSection title="Notification delivery">
        <SettingRow title="Inbox counts in sidebar" description="Show issue and inbox counts in the main workspace sidebar.">
          <ToggleSwitch checked={preferences.sidebar_counts} onClick={() => updatePreference({ sidebar_counts: !preferences.sidebar_counts })} testId="notification-sidebar-counts" />
        </SettingRow>
        <SettingRow title="Convert quick reactions" description="Keep comment notifications readable by converting common emoticons.">
          <ToggleSwitch checked={preferences.convert_emoticons} onClick={() => updatePreference({ convert_emoticons: !preferences.convert_emoticons })} testId="notification-emoticons" />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

function MembersContent({ users, teams, mutate }: { users: LinearUser[]; teams: Team[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ full_name: "", username: "", email: "", role: "standard", team_id: teams[0]?.id || "" });

  useEffect(() => {
    if (!form.team_id && teams[0]?.id) setForm((current) => ({ ...current, team_id: teams[0]?.id || "" }));
  }, [teams]);

  return (
    <div data-testid="settings-members-page">
      <SettingsTitle title="Members" description="Inviting a member creates a real user and adds them to the selected team through the same tool server used by agents." />
      <SettingsSection title="Invite member">
        <InlineForm
          fields={[
            ["full_name", "Full name"],
            ["username", "Username"],
            ["email", "Email"],
          ]}
          form={form}
          setForm={setForm}
          extra={<SelectPill value={form.team_id} options={teams.map((team) => team.id || "").filter(Boolean)} labels={Object.fromEntries(teams.map((team) => [team.id || "", team.name || team.key || "Team"]))} onChange={(value) => setForm((current) => ({ ...current, team_id: value }))} testId="member-team-select" />}
          submitLabel="Invite member"
          onSubmit={() => mutate("Member created and added to team.", async () => {
            const created = await callTool<{ user?: LinearUser }>("create_user", { full_name: form.full_name, username: form.username, email: form.email, role: form.role, password: "password" });
            const userId = created.structured_content?.user?.id;
            if (userId && form.team_id) await callTool("add_team_member", { team_id: form.team_id, user_id: userId, role: "member" });
          })}
        />
      </SettingsSection>
      <SettingsSection title="Workspace members">
        {users.map((member) => (
          <DataRow key={member.id || member.username} title={member.full_name || member.username || "Member"} description={member.email || member.username || ""} right={<StatusPill>{member.role || "standard"}</StatusPill>} />
        ))}
      </SettingsSection>
    </div>
  );
}

function WorkspaceContent({ workspaces, mutate }: { workspaces: Workspace[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const workspace = workspaces[0] || { id: "wks_001", name: "Collinear Clone Studio", url_key: "linear-clone" };
  const [form, setForm] = useState({ id: workspace.id || "wks_001", name: workspace.name || "", url_key: workspace.url_key || "" });

  useEffect(() => {
    setForm({ id: workspace.id || "wks_001", name: workspace.name || "", url_key: workspace.url_key || "" });
  }, [workspace.id, workspace.name, workspace.url_key]);

  return (
    <div data-testid="settings-workspace-page">
      <SettingsTitle title="Workspace" description="Workspace edits are written to the workspace table used by search, team ownership, and seed data." />
      <SettingsSection title="Workspace profile">
        <InlineForm
          fields={[
            ["name", "Workspace name"],
            ["url_key", "Workspace URL key"],
          ]}
          form={form}
          setForm={setForm}
          submitLabel="Save workspace"
          onSubmit={() => mutate("Workspace updated.", () => callTool("update_workspace", form))}
        />
      </SettingsSection>
    </div>
  );
}

function TeamWorkflowContent({ teams, workflowStates, mutate }: { teams: Team[]; workflowStates: WorkflowState[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ team_id: teams[0]?.id || "", name: "", category: "started", color: "#5e6ad2", position: workflowStates.length + 1 });

  useEffect(() => {
    if (!form.team_id && teams[0]?.id) setForm((current) => ({ ...current, team_id: teams[0]?.id || "" }));
  }, [teams]);

  return (
    <div data-testid="settings-teams-page">
      <SettingsTitle title="Teams" description="Workflow states are the real states used by issue lists and board columns." />
      <SettingsSection title="Create workflow state">
        <InlineForm
          fields={[
            ["name", "State name"],
            ["category", "Category"],
            ["color", "Color"],
          ]}
          form={form}
          setForm={setForm}
          extra={<SelectPill value={form.team_id} options={teams.map((team) => team.id || "").filter(Boolean)} labels={Object.fromEntries(teams.map((team) => [team.id || "", team.name || team.key || "Team"]))} onChange={(value) => setForm((current) => ({ ...current, team_id: value }))} testId="workflow-team-select" />}
          submitLabel="Create state"
          onSubmit={() => mutate("Workflow state created. Issue board columns now use this state.", () => callTool("create_workflow_state", form))}
        />
      </SettingsSection>
      <SettingsSection title="Current workflow states">
        {workflowStates.map((state) => (
          <DataRow key={state.id || state.name} title={state.name || "State"} description={`${state.team_key || "Team"} · ${state.type || "workflow"}`} right={<ColorDot color={state.color || "#8a8f98"} />} />
        ))}
      </SettingsSection>
    </div>
  );
}

function ProjectStatusesContent({ statuses, workspaces, mutate }: { statuses: ProjectStatus[]; workspaces: Workspace[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ workspace_id: workspaces[0]?.id || "wks_001", name: "", category: "active", color: "#5e6ad2", position: statuses.length + 1, is_default: false });

  return (
    <div data-testid="settings-project-statuses-page">
      <SettingsTitle title="Statuses" description="Project statuses are persisted in the database and exposed through /step for agents and future project workflows." />
      <SettingsSection title="Create project status">
        <InlineForm
          fields={[
            ["name", "Status name"],
            ["category", "Category"],
            ["color", "Color"],
          ]}
          form={form}
          setForm={setForm}
          submitLabel="Create status"
          onSubmit={() => mutate("Project status created.", () => callTool("create_project_status", form))}
        />
      </SettingsSection>
      <SettingsSection title="Project status options">
        {statuses.map((status) => (
          <DataRow key={status.id || status.name} title={status.name || "Status"} description={status.category || "active"} right={<span className="flex items-center gap-3"><ColorDot color={status.color || "#5e6ad2"} />{status.is_default && <StatusPill>Default</StatusPill>}</span>} />
        ))}
      </SettingsSection>
    </div>
  );
}

function LabelsContent({ labels, teams, title, mutate }: { labels: Label[]; teams: Team[]; title: string; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ team_id: teams[0]?.id || "", name: "", color: "#5e6ad2" });

  useEffect(() => {
    if (!form.team_id && teams[0]?.id) setForm((current) => ({ ...current, team_id: teams[0]?.id || "" }));
  }, [teams]);

  return (
    <div data-testid={`settings-${slug(title)}-page`}>
      <SettingsTitle title={title} description="Labels are real database rows. New labels immediately appear in issue creation and label pickers." />
      <SettingsSection title="Create label">
        <InlineForm
          fields={[
            ["name", "Label name"],
            ["color", "Color"],
          ]}
          form={form}
          setForm={setForm}
          extra={<SelectPill value={form.team_id} options={teams.map((team) => team.id || "").filter(Boolean)} labels={Object.fromEntries(teams.map((team) => [team.id || "", team.name || team.key || "Team"]))} onChange={(value) => setForm((current) => ({ ...current, team_id: value }))} testId="label-team-select" />}
          submitLabel="Create label"
          onSubmit={() => mutate("Label created and available in issue flows.", () => callTool("create_label", form))}
        />
      </SettingsSection>
      <SettingsSection title="Existing labels">
        {labels.map((label) => (
          <DataRow key={label.id || label.name} title={label.name || "Label"} description={label.id || ""} right={<ColorDot color={label.color || "#5e6ad2"} />} />
        ))}
      </SettingsSection>
    </div>
  );
}

function TemplatesContent({ templates, teams, title, mutate }: { templates: Template[]; teams: Team[]; title: string; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ team_id: teams[0]?.id || "", name: "", priority: "medium" });

  useEffect(() => {
    if (!form.team_id && teams[0]?.id) setForm((current) => ({ ...current, team_id: teams[0]?.id || "" }));
  }, [teams]);

  return (
    <div data-testid={`settings-${slug(title)}-page`}>
      <SettingsTitle title={title} description="Templates are backed by issue_templates and can seed future issue workflows." />
      <SettingsSection title="Create template">
        <InlineForm
          fields={[
            ["name", "Template name"],
            ["priority", "Default priority"],
          ]}
          form={form}
          setForm={setForm}
          extra={<SelectPill value={form.team_id} options={teams.map((team) => team.id || "").filter(Boolean)} labels={Object.fromEntries(teams.map((team) => [team.id || "", team.name || team.key || "Team"]))} onChange={(value) => setForm((current) => ({ ...current, team_id: value }))} testId="template-team-select" />}
          submitLabel="Create template"
          onSubmit={() => mutate("Template created.", () => callTool("create_template", { team_id: form.team_id, name: form.name, payload_json: { priority: form.priority }, created_by: "user_001" }))}
        />
      </SettingsSection>
      <SettingsSection title="Existing templates">
        {templates.map((template) => (
          <DataRow key={template.id || template.name} title={template.name || "Template"} description={template.team_id || "Team template"} right={<StatusPill>Issue</StatusPill>} />
        ))}
      </SettingsSection>
    </div>
  );
}

function ApiAccessContent({ apiKeys, workspaces, settingActions, mutate }: { apiKeys: ApiKey[]; workspaces: Workspace[]; settingActions: SettingAction[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [token, setToken] = useState<string | null>(null);
  const latestApiActions = latestActionsForPage(settingActions, "api");
  const oauthApps = latestApiActions["OAuth Applications"] ? [{ name: "Clone API Console", created: "just now" }] : [];
  const webhooks = latestApiActions.Webhooks ? [{ name: "Issue activity webhook", url: "https://example.com/linear/webhook" }] : [];
  const apiKeyPolicy = latestApiActions["API key creation"] || "Only admins";
  const activeKeys = apiKeys.filter((key) => !key.revoked_at);
  const createApiKey = async () => {
    const created = await callTool("create_api_key", {
      name: `testing ${apiKeys.length + 1}`,
      workspace_id: workspaces[0]?.id || "wks_001",
      created_by: "user_001",
      agent_name: "POST /step automation",
      scopes: ["read", "write", "admin"],
    });
    const content = created.structured_content as { token?: string | null } | undefined;
    setToken(content?.token || null);
  };

  return (
    <div data-testid="settings-api-page">
      <div className="pt-0" />
      {token && <OneTimeToken token={token} />}
      <LinearApiSection title="OAuth Applications" description="Manage your organization's OAuth applications." docs>
        {oauthApps.length ? oauthApps.map((app) => <LinearApiRow key={app.name} title={app.name} description={`Created ${app.created} · confidential client`} action="Configure" onClick={() => mutate("OAuth application configured.", () => callTool("record_setting_action", { page_key: "api", action: "OAuth Applications", value: "Configured", actor_id: "user_001" }))} />) : <LinearApiRow title="No OAuth applications" action="+ New OAuth application" onClick={() => mutate("OAuth application created.", () => callTool("record_setting_action", { page_key: "api", action: "OAuth Applications", value: "Clone API Console", actor_id: "user_001" }))} />}
      </LinearApiSection>
      <LinearApiSection title="Webhooks" description="Webhooks allow you to receive HTTP requests when an entity is created, updated, or deleted." docs>
        {webhooks.length ? webhooks.map((webhook) => <LinearApiRow key={webhook.url} title={webhook.name} description={webhook.url} action="Enabled" onClick={() => mutate("Webhook enabled.", () => callTool("record_setting_action", { page_key: "api", action: "Webhooks", value: "Enabled", actor_id: "user_001" }))} />) : <LinearApiRow title="No webhooks" action="+ New webhook" onClick={() => mutate("Webhook created.", () => callTool("record_setting_action", { page_key: "api", action: "Webhooks", value: "Issue activity webhook", actor_id: "user_001" }))} />}
      </LinearApiSection>
      <LinearApiSection title="Member API keys" description="Members of your workspace can create API keys to interact with the Linear API on their behalf." secondary="View your personal API keys from your security & access settings.">
        <LinearApiRow title="API key creation" description="Who can create API keys to interact with the Linear API on their behalf" action={apiKeyPolicy} dropdown onClick={() => mutate("API key policy updated.", () => callTool("record_setting_action", { page_key: "api", action: "API key creation", value: apiKeyPolicy === "Only admins" ? "All members" : "Only admins", actor_id: "user_001" }))} />
        <div className="border-t border-[#ededee]">
          <div className="flex items-center justify-between border-b border-[#ededee] px-5 py-4">
            <div className="text-[14px] font-medium text-[#24262b]">Active · {activeKeys.length || 1} API key</div>
            <button className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#24262b] hover:bg-[#f7f7f8]" type="button" onClick={() => mutate("", createApiKey)}>
              + New API key
            </button>
          </div>
          {activeKeys.length ? (
            activeKeys.map((apiKey) => (
              <div className="flex min-h-[70px] items-center gap-3 border-b border-[#ededee] px-5 py-4 last:border-b-0" key={apiKey.id || apiKey.name || apiKey.token_prefix}>
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1d9bf0] text-[13px] font-medium text-white">PJ</div>
                <div className="min-w-0 text-[13px] leading-5">
                  <div className="truncate text-[14px] font-medium text-[#24262b]">
                    {apiKey.name || "testing"} <span className="font-normal text-[#656872]">· {apiKey.scopes?.includes("admin") ? "full access" : "read/write access"} · public teams</span>
                  </div>
                  <div className="truncate text-[#656872]">{apiKey.created_by_name || "parikshit.joon@gmail.com"} created about 20 hours ago · last used on Apr 29, 2026</div>
                </div>
              </div>
            ))
          ) : (
            <button
              className="flex min-h-[70px] w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#f7f7f8]"
              type="button"
              onClick={() => mutate("", async () => {
                await createApiKey();
              })}
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1d9bf0] text-[13px] font-medium text-white">PJ</div>
              <div className="min-w-0 text-[13px] leading-5">
                <div className="truncate text-[14px] font-medium text-[#24262b]">testing <span className="font-normal text-[#656872]">· full access · public teams</span></div>
                <div className="truncate text-[#656872]">parikshit.joon@gmail.com created about 20 hours ago · last used on Apr 29, 2026</div>
              </div>
            </button>
          )}
        </div>
      </LinearApiSection>
    </div>
  );
}

function LinearApiSection({ title, description, secondary, docs = false, children }: { title: string; description: string; secondary?: string; docs?: boolean; children: ReactNode }) {
  return (
    <section className="mb-[42px] last:mb-0" data-testid={`settings-section-${slug(title)}`}>
      <h2 className="mb-1.5 text-[16px] font-medium leading-5 tracking-[-0.012em] text-[#24262b]">{title}</h2>
      <p className="text-[13px] leading-[19px] text-[#656872]">
        {description} {docs && <span className="font-medium text-[#24262b]">Docs ↗</span>}
      </p>
      {secondary && <p className="mt-1 text-[13px] leading-[19px] text-[#656872]">{secondary}</p>}
      <div className="mt-[18px] overflow-hidden rounded-xl border border-[#e2e3e6] bg-background shadow-none">{children}</div>
    </section>
  );
}

function LinearApiRow({ title, description, action, dropdown = false, onClick }: { title: string; description?: string; action: string; dropdown?: boolean; onClick?: () => void }) {
  return (
    <div className="flex min-h-[63px] items-center justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium leading-5 text-[#24262b]">{title}</div>
        {description && <div className="mt-0.5 truncate text-[12.5px] leading-[18px] text-[#656872]">{description}</div>}
      </div>
      <button className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg text-[13px] font-medium ${dropdown ? "border border-[#dedfe3] bg-background px-3 text-[#34363c]" : "px-2 text-[#24262b]"} ${onClick ? "hover:bg-[#f7f7f8]" : ""}`} type="button" onClick={onClick}>
        <span>{action}</span>
        {dropdown && <ChevronDown size={14} className="text-[#656872]" />}
      </button>
    </div>
  );
}

function AiAgentsContent({ apiKeys, workspaces, mutate }: { apiKeys: ApiKey[]; workspaces: Workspace[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const activeAgentKeys = apiKeys.filter((key) => !key.revoked_at && (key.agent_name || key.scopes?.includes("write")));
  const [form, setForm] = useState({
    name: "Linear clone agent",
    workspace_id: workspaces[0]?.id || "wks_001",
    agent_name: "Browser automation agent",
    scopes: "read,write,admin",
  });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!form.workspace_id && workspaces[0]?.id) setForm((current) => ({ ...current, workspace_id: workspaces[0]?.id || "wks_001" }));
  }, [workspaces]);

  return (
    <div data-testid="settings-ai-agents-page">
      <SettingsTitle title="AI & Agents" description="Agent access is backed by real API keys, so this page changes what automation can do against the same /step server used by the UI and verifier." />
      {token && <OneTimeToken token={token} />}
      <SettingsSection title="Agent access">
        <SettingRow title="Tool server connection" description="Agents call POST /step with an API key and mutate the same workspace data as the React UI.">
          <StatusPill>{activeAgentKeys.length ? "Connected" : "Not connected"}</StatusPill>
        </SettingRow>
        <SettingRow title="Write access" description="Create, update, and revoke capability is represented by write/admin scopes.">
          <StatusPill>{activeAgentKeys.some((key) => key.scopes?.includes("write") || key.scopes?.includes("admin")) ? "Enabled" : "Disabled"}</StatusPill>
        </SettingRow>
      </SettingsSection>
      <SettingsSection title="Create agent key">
        <InlineForm
          fields={[
            ["name", "Key name"],
            ["agent_name", "Agent name"],
            ["scopes", "Scopes"],
          ]}
          form={form}
          setForm={setForm}
          extra={<SelectPill value={form.workspace_id} options={workspaceOptions(workspaces, form.workspace_id)} labels={workspaceLabels(workspaces, form.workspace_id)} onChange={(value) => setForm((current) => ({ ...current, workspace_id: value }))} testId="agent-workspace-select" />}
          submitLabel="Create agent key"
          onSubmit={() => mutate("Agent key created and connected.", async () => {
            const created = await callTool("create_api_key", {
              name: form.name,
              workspace_id: form.workspace_id || "wks_001",
              created_by: "user_001",
              agent_name: form.agent_name,
              scopes: form.scopes.split(",").map((scope) => scope.trim()).filter(Boolean),
            });
            const content = created.structured_content as { token?: string | null } | undefined;
            setToken(content?.token || null);
          })}
        />
      </SettingsSection>
      <SettingsSection title="Connected agents">
        {apiKeys.length ? apiKeys.map((apiKey) => (
          <DataRow
            key={apiKey.id || apiKey.name}
            title={apiKey.agent_name || apiKey.name || "Agent"}
            description={apiKeyDescription(apiKey)}
            right={<StatusPill>{apiKey.revoked_at ? "Revoked" : "Active"}</StatusPill>}
          />
        )) : <EmptySettingsRow title="No connected agents" description="Create an agent key to connect automation to this workspace." />}
      </SettingsSection>
    </div>
  );
}

function OneTimeToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const curlCommand = `curl -X POST ${window.location.origin}/step \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${token}' \\
  -d '{"action":{"tool_name":"global_search","parameters":{"query":"submission","limit":5}}}'`;

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(true);
      window.setTimeout(() => setCopiedCurl(false), 1800);
    } catch {
      setCopiedCurl(false);
    }
  };

  return (
    <div
      className="fixed bottom-12 left-[calc(245px+1.5rem)] right-8 z-50 max-w-[640px] rounded-xl border border-[#cfd9ff] bg-[#f5f7ff]/95 px-4 py-3 text-[13px] text-[#34363c] shadow-[0_18px_52px_rgba(37,43,89,0.16)] backdrop-blur max-[900px]:left-[calc(220px+1rem)] max-[620px]:bottom-16 max-[620px]:right-4"
      data-testid="api-token-created"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-medium text-[#24262b]">Copy this token now. It is only shown once.</div>
        {copied && <span className="text-[12px] font-medium text-[#5e6ad2]">Copied</span>}
      </div>
      <div className="flex items-center gap-2">
        <code className="block min-w-0 flex-1 overflow-auto rounded-lg border border-[#d9e2ff] bg-white px-3 py-2 font-mono text-[12px] text-[#24262b]">{token}</code>
        <button
          aria-label="Copy API token"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#d9e2ff] bg-white text-[#34363c] shadow-sm hover:bg-[#f8f9ff]"
          data-testid="api-token-copy"
          onClick={copyToken}
          type="button"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="block min-w-0 flex-1 overflow-auto rounded-lg border border-[#d9e2ff] bg-white px-3 py-2 font-mono text-[11px] leading-5 text-[#24262b]">
          {curlCommand}
        </code>
        <button
          aria-label="Copy authenticated curl"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#d9e2ff] bg-white px-3 text-[12px] font-medium text-[#34363c] shadow-sm hover:bg-[#f8f9ff]"
          data-testid="api-token-copy-curl"
          onClick={copyCurl}
          type="button"
        >
          {copiedCurl ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedCurl ? "Copied" : "Copy curl"}</span>
        </button>
      </div>
    </div>
  );
}

function EmptySettingsRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-5 text-[14px] text-[#656872]">
      <div className="font-medium text-[#2b2d33]">{title}</div>
      <div className="mt-1 text-[13px]">{description}</div>
    </div>
  );
}

function apiKeyDescription(apiKey: ApiKey) {
  const state = apiKey.revoked_at ? "revoked" : "active";
  const scopes = apiKey.scopes ? apiKey.scopes.split(",").map((scope) => scope.trim()).filter(Boolean).join(", ") : "read";
  const prefix = apiKey.token_prefix ? `${apiKey.token_prefix}...` : "hidden token";
  return `${prefix} · ${scopes} · ${apiKey.workspace_name || "Workspace"} · ${state}`;
}

function workspaceOptions(workspaces: Workspace[], current: string) {
  const ids = workspaces.map((workspace) => workspace.id || "").filter(Boolean);
  return ids.includes(current) ? ids : [current || "wks_001", ...ids].filter(Boolean);
}

function workspaceLabels(workspaces: Workspace[], current: string) {
  return {
    [current || "wks_001"]: workspaces.find((workspace) => workspace.id === current)?.name || "Collinear Clone Studio",
    ...Object.fromEntries(workspaces.map((workspace) => [workspace.id || "", workspace.name || workspace.url_key || "Workspace"])),
  };
}

function SettingsStub({ section, settingActions, mutate }: { section: SettingsSection; settingActions: SettingAction[]; mutate: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const rows = stubRows(section.key);
  const persisted = latestActionsForPage(settingActions, section.key);
  const [overrides, setOverrides] = useState<Record<string, string>>(persisted);

  useEffect(() => {
    setOverrides(persisted);
  }, [section.key, settingActions.length]);

  const changeRow = async (row: { title: string; kind: string; value?: string; enabled?: boolean }) => {
    const current = overrides[row.title] || row.value || (row.enabled ? "Enabled" : "Disabled");
    const next = nextSettingValue(current, row.kind, section.key);
    setOverrides((existing) => ({ ...existing, [row.title]: next }));
    await mutate(`${section.label} updated.`, () => callTool("record_setting_action", { page_key: section.key, action: row.title, value: next, actor_id: "user_001" }));
  };

  return (
    <div data-testid={`settings-${section.key}-page`}>
      <SettingsTitle title={section.label} description={stubDescription(section.key)} />
      <SettingsSection title={stubSectionTitle(section.key)}>
        {rows.map((row) => (
          <SettingRow key={row.title} title={row.title} description={row.description}>
            {row.kind === "toggle" ? (
              <ToggleSwitch checked={(overrides[row.title] || (row.enabled ? "Enabled" : "Disabled")) === "Enabled"} onClick={() => changeRow(row)} testId={`settings-${section.key}-${slug(row.title)}`} />
            ) : (
              <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedfe3] bg-background px-3 text-[13px] font-medium text-[#34363c] hover:bg-[#f7f7f8]" type="button" onClick={() => changeRow(row)}>
                {overrides[row.title] || row.value || "Configure"}
              </button>
            )}
          </SettingRow>
        ))}
      </SettingsSection>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
        This page is a high-fidelity Tier 2 settings surface. The core settings pages around preferences, members, workspace, labels, templates, teams, and statuses are connected to the tool server and Postgres.
      </div>
    </div>
  );
}

function nextSettingValue(current: string, kind: string, pageKey: string) {
  if (kind === "toggle") return current === "Enabled" ? "Disabled" : "Enabled";
  if (pageKey === "security" || pageKey === "admin-security") return current === "Enabled" ? "Review" : "Enabled";
  if (pageKey === "connected-accounts" || pageKey === "integrations") return current === "Connected" ? "Disconnected" : "Connected";
  if (pageKey === "billing") return current === "Current" ? "Manage" : "Current";
  if (current === "Available") return "Connected";
  if (current === "Set up") return "Enabled";
  if (current === "Recommended") return "Enabled";
  if (current === "Review") return "Configured";
  if (current === "Workspace") return "Private";
  if (current === "Private") return "Workspace";
  return current === "Configured" ? "Review" : "Configured";
}

function latestActionsForPage(actions: SettingAction[], pageKey: string) {
  const latest: Record<string, string> = {};
  for (const action of actions) {
    if (action.page_key === pageKey && action.action && action.value && !latest[action.action]) latest[action.action] = action.value;
  }
  return latest;
}

function SettingsTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-9 max-[900px]:mb-7">
      <h1 className="text-[28px] font-medium leading-[1.15] tracking-[-0.035em] text-[#202124] max-[900px]:text-[26px]">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#62656d]">{description}</p>}
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12 max-[900px]:mb-10" data-testid={`settings-section-${slug(title)}`}>
      <h2 className="mb-5 text-[19px] font-medium leading-[1.2] tracking-[-0.025em] text-[#24262b] max-[900px]:text-[18px]">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-[#e2e3e6] bg-background shadow-none">
        {children}
      </div>
    </section>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[65px] items-center justify-between gap-8 border-b border-[#ededee] px-5 py-2.5 last:border-b-0 max-[900px]:gap-4 max-[900px]:px-4 max-[620px]:flex-col max-[620px]:items-start max-[620px]:gap-2.5 max-[620px]:py-3.5">
      <div className="min-w-0">
        <h3 className="text-[14px] font-medium leading-5 tracking-[-0.012em] text-[#2b2d33]">{title}</h3>
        <p className="mt-0.5 text-[13px] leading-5 text-[#656872]">{description}</p>
      </div>
      <div className="shrink-0 max-[620px]:w-full max-[620px]:[&_label]:w-full max-[620px]:[&_select]:w-full">{children}</div>
    </div>
  );
}

function DataRow({ title, description, right }: { title: string; description: string; right: ReactNode }) {
  return (
    <div className="flex min-h-[64px] items-center justify-between gap-5 border-b border-[#ededee] px-5 py-3 last:border-b-0">
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-medium text-[#2b2d33]">{title}</h3>
        <p className="truncate text-[13px] text-[#656872]">{description}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function InlineForm<T extends Record<string, unknown>>({ fields, form, setForm, onSubmit, submitLabel, extra }: { fields: Array<[keyof T & string, string]>; form: T; setForm: (value: T | ((current: T) => T)) => void; onSubmit: () => Promise<void>; submitLabel: string; extra?: ReactNode }) {
  return (
    <form
      className="space-y-3.5 px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(([key, label]) => (
          <label className="block" key={key}>
            <span className="mb-1 block text-[13px] font-medium text-[#656872]">{label}</span>
            <input
              className="h-10 w-full rounded-lg border border-[#dedfe3] bg-background px-3 text-[14px] text-[#24262b] outline-none transition-colors focus:border-[var(--accent)]"
              value={String(form[key] || "")}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      {extra}
      <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#5e6ad2] px-2.5 text-[13px] font-medium text-white shadow-none hover:bg-[#555fc8]" type="submit">
        <Plus size={13} />
        {submitLabel}
      </button>
    </form>
  );
}

function SelectPill({ value, options, labels, onChange, testId }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void; testId: string }) {
  return (
    <label className="relative block">
      <select
        className="h-8 min-w-28 max-w-[220px] appearance-none truncate rounded-lg border border-[#dedfe3] bg-background pl-3 pr-8 text-[14px] font-normal text-[#34363c] shadow-none outline-none transition-colors hover:bg-[#f7f7f8] focus:border-[var(--accent)]"
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{labels?.[option] || option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#656872]" />
    </label>
  );
}

function ToggleSwitch({ checked, onClick, testId, disabled = false }: { checked: boolean; onClick: () => void; testId: string; disabled?: boolean }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--accent)]" : "bg-[#c9c9c9]"} ${disabled ? "cursor-default opacity-70" : "hover:brightness-95"}`}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={`absolute top-0.5 grid size-4 place-items-center rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}>
        {checked && <span className="size-1 rounded-full bg-[var(--accent)]" />}
      </span>
    </button>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">{children}</span>;
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block size-4 rounded-full border border-border" style={{ backgroundColor: color }} />;
}

function getActiveKey(pathname: string) {
  const normalized = pathname.replace(/\/$/, "") || "/settings";
  const exact = settingsSections.find((section) => section.path === normalized);
  if (exact) return exact.key;
  if (normalized === "/settings") return "preferences";
  const suffix = normalized.replace(/^\/settings\/?/, "");
  if (!suffix) return "preferences";
  const key = suffix.split("/").pop() || "";
  if (key === "connections") return "connected-accounts";
  if (key === "agents") return "agent-personalization";
  if (key === "ai") return "ai-agents";
  if (key === "sla") return "slas";
  if (key === "security" && suffix === "security") return "admin-security";
  return settingsSections.some((section) => section.key === key) ? key : "preferences";
}

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function stubSectionTitle(key: string) {
  if (key === "security" || key === "admin-security") return "Access controls";
  if (key === "connected-accounts") return "Connections";
  if (key === "integrations") return "Connected tools";
  if (key === "api") return "Developer access";
  return "Settings";
}

function stubDescription(key: string) {
  const descriptions: Record<string, string> = {
    security: "Review account access, active sessions, passkeys, and workspace-level security controls.",
    "admin-security": "Manage organization-wide security settings and access review policies.",
    "connected-accounts": "Connect calendar, source control, and communication accounts used across workspace workflows.",
    "agent-personalization": "Tune how Linear agents understand your role, writing style, and preferred project context.",
    integrations: "Configure external tools that keep issues, projects, documents, and customer requests in sync.",
    api: "Manage API access for scripts, integrations, and the clone assignment tool server.",
  };
  return descriptions[key] || "This Linear settings area is represented as a polished Tier 2 surface with realistic rows and navigation.";
}

function stubRows(key: string) {
  const rows: Record<string, Array<{ title: string; description: string; kind: string; value?: string; enabled?: boolean }>> = {
    security: [
      { title: "Two-factor authentication", description: "Require an additional verification step when signing in.", kind: "status", value: "Recommended" },
      { title: "Active sessions", description: "Review devices currently signed into this workspace.", kind: "status", value: "2 sessions" },
      { title: "Passkeys", description: "Use platform authenticators for faster secure sign-in.", kind: "status", value: "Set up" },
    ],
    "connected-accounts": [
      { title: "GitHub", description: "Link pull requests, commits, and branches to issues.", kind: "status", value: "Connected" },
      { title: "Slack", description: "Create and follow issues from Slack conversations.", kind: "status", value: "Connected" },
      { title: "Google Calendar", description: "Used for scheduling issue reminders and focus time.", kind: "status", value: "Available" },
    ],
    "agent-personalization": [
      { title: "Role context", description: "Tell Linear agents what kinds of work you usually own.", kind: "status", value: "Engineering" },
      { title: "Writing style", description: "Controls summaries, asks, and project update tone.", kind: "status", value: "Concise" },
      { title: "Use workspace history", description: "Allow agents to use issue and project history for suggestions.", kind: "toggle", enabled: true },
    ],
    integrations: [
      { title: "GitHub", description: "Sync pull requests, branches, and commit references.", kind: "status", value: "Connected" },
      { title: "Slack", description: "Create issues and receive workspace notifications.", kind: "status", value: "Connected" },
      { title: "Figma", description: "Attach design links and preview handoff artifacts.", kind: "status", value: "Available" },
    ],
    api: [
      { title: "Tool server", description: "Clone assignment POST /step endpoint.", kind: "status", value: "Enabled" },
      { title: "Webhook signing", description: "Verify external webhook payloads.", kind: "status", value: "Enabled" },
      { title: "Personal API keys", description: "Access Linear data from scripts and internal tools.", kind: "status", value: "1 active" },
    ],
  };

  return rows[key] || [
    { title: "Enabled", description: "This setting is available in the seeded workspace.", kind: "toggle", enabled: true },
    { title: "Visibility", description: "Choose whether this area appears in workspace navigation.", kind: "status", value: "Workspace" },
    { title: "Default behavior", description: "Applies to newly created issues, projects, and views.", kind: "status", value: "Review" },
  ];
}
