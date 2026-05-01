import { Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Check,
  CircleDashed,
  Folder,
  Link2,
  ListPlus,
  Maximize2,
  MoreHorizontal,
  Paperclip,
  Repeat2,
  SquarePlus,
  Tag,
  User,
  X,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { Label, LinearUser, Project, Team } from "../linearTypes";
import { issueKey, projectTitle, userName } from "../linearTypes";
import { PriorityIcon, StatusIcon } from "./IssueExplorer";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { ErrorBanner } from "./ui";

const statusOptions = [
  { label: "Backlog", shortcut: "1" },
  { label: "Todo", shortcut: "2" },
  { label: "In Progress", shortcut: "3" },
  { label: "In Review", shortcut: "4" },
  { label: "Done", shortcut: "5" },
  { label: "Canceled", shortcut: "6" },
  { label: "Duplicate", shortcut: "7" },
];
const priorityOptions = [
  { label: "No priority", value: "", shortcut: "0" },
  { label: "Urgent", value: "Urgent", shortcut: "1" },
  { label: "High", value: "High", shortcut: "2" },
  { label: "Medium", value: "Medium", shortcut: "3" },
  { label: "Low", value: "Low", shortcut: "4" },
];
const defaultLabels: Label[] = [
  { id: "bug", name: "Bug", color: "#ef4444" },
  { id: "feature", name: "Feature", color: "#a970ff" },
  { id: "improvement", name: "Improvement", color: "#3b9bff" },
];
type QuickCreateMenu = "team" | "status" | "priority" | "assignee" | "project" | "labels" | "more" | null;

export function QuickCreateModal({
  open,
  onClose,
  initialProjectId = "",
}: {
  open: boolean;
  onClose: () => void;
  initialProjectId?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const wasOpen = useRef(open);
  const menuHandoffUntil = useRef(0);
  const [dismissed, setDismissed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("ENG");
  const [status, setStatus] = useState("Backlog");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<QuickCreateMenu>(null);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(defaultLabels[1]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setDismissed(false);
      setActiveMenu(null);
      setAssigneeQuery("");
      if (initialProjectId) setProjectId(initialProjectId);
    }
    if (!open) {
      setDismissed(false);
      setActiveMenu(null);
      setAssigneeQuery("");
    }
    wasOpen.current = open;
  }, [open, initialProjectId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      readTool("list_teams"),
      readTool("search_projects", { limit: 50 }),
      readTool("search_users", { limit: 50 }),
      readTool("search_labels", { query: "", limit: 80 }),
    ]).then(([teamResponse, projectResponse, userResponse, labelResponse]) => {
      const nextTeams = collectionFrom<Team>(teamResponse.data, ["teams", "results"]);
      setTeams(nextTeams);
      const routeTeam = location.pathname.match(/\/team\/([^/]+)/)?.[1]?.toUpperCase();
      const validTeam = nextTeams.find((item) => (item.key || item.id || item.name || "").toUpperCase() === team.toUpperCase());
      const routeTeamOption = nextTeams.find((item) => (item.key || item.id || item.name || "").toUpperCase() === routeTeam);
      const fallbackTeam = routeTeamOption || validTeam || nextTeams[0];
      if (fallbackTeam) setTeam(fallbackTeam.key || fallbackTeam.id || fallbackTeam.name || "ENG");
      setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
      setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
      setLabels(collectionFrom<Label>(labelResponse.data, ["labels", "results"]));
    });
  }, [location.pathname, open, team]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("Backlog");
    setPriority("");
    setProjectId("");
    setAssigneeId("");
    setAssigneeQuery("");
    setActiveMenu(null);
    setError(null);
  };

  const handleClose = () => {
    setActiveMenu(null);
    setDismissed(true);
    onClose();
  };

  const visible = open && !dismissed;
  const closeHref = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!visible) return;

    const closeFromNativeEvent = (event: MouseEvent | PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-testid="quick-create-close"], [aria-label="Close"]')) return;
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    };

    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleClose();
    };

    document.addEventListener("pointerdown", closeFromNativeEvent, true);
    document.addEventListener("click", closeFromNativeEvent, true);
    document.addEventListener("keydown", closeFromEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromNativeEvent, true);
      document.removeEventListener("click", closeFromNativeEvent, true);
      document.removeEventListener("keydown", closeFromEscape, true);
    };
  }, [visible]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Issue title is required.");
      return;
    }
    setSubmitting(true);
    const response = await readTool("create_issue", {
      title: title.trim(),
      name: title.trim(),
      description: description.trim(),
      team_key: team,
      teamKey: team,
      state: status,
      status,
      priority: priority ? priority.toLowerCase() : undefined,
      project_id: projectId,
      assignee_id: assigneeId,
      label_names: selectedLabel?.name ? [selectedLabel.name] : undefined,
    });
    setSubmitting(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const data = response.data as Record<string, unknown> | null;
    const issue = (data?.issue || data) as Parameters<typeof issueKey>[0];
    reset();
    handleClose();
    if (issue) navigate(`/issue/${issueKey(issue)}`);
  };

  const labelOptions = mergeLabels(labels);
  const labelDetail = selectedLabel || labelOptions.find((item) => item.name === "Feature") || labelOptions[0];
  const tomorrowLabel = formatDueDate(1);
  const nextWeekLabel = formatDueDate(7);
  const shouldIgnoreMenuClose = () => Date.now() < menuHandoffUntil.current;
  const filteredAssignees = users.filter((user) => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return true;
    return [userName(user), user.username, user.email, user.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <Dialog open={visible} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="z-[60] top-[27.6%] w-[min(738px,calc(100vw-2rem))] max-w-[738px] gap-0 overflow-hidden rounded-[20px] border border-[#d8d9dd] bg-white p-0 text-[#1f2023] shadow-[0_22px_54px_rgba(18,19,22,0.28)] ring-0 sm:max-w-[738px]"
        data-testid="quick-create-modal"
      >
        <DialogHeader className="h-12 flex-row items-center gap-2 px-2.5 py-0 pr-[76px]">
          <DropdownMenu
            modal={false}
            open={activeMenu === "team"}
            onOpenChange={(nextOpen) => {
              setActiveMenu((current) => {
                if (nextOpen) return "team";
                return current === "team" ? null : current;
              });
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="xs" className="h-7 gap-1.5 rounded-[9px] border-[#e0e1e5] bg-white px-2 text-[13px] font-medium text-[#62656c] shadow-none hover:bg-[#f7f7f8]">
                <span className="flex size-4 items-center justify-center rounded-[5px] bg-[#eef1ff] text-[10px] font-semibold text-[#6d78e8]">
                  {team.slice(0, 1)}
                </span>
                {team}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-[12px] border-[#dedfe3] bg-white p-1.5 text-[#23252a] shadow-[0_14px_34px_rgba(17,18,22,0.18)] ring-0 data-[state=closed]:hidden" data-testid="quick-create-team-menu">
              {(teams.length ? teams : [{ key: "ENG", name: "ENG" } as Team]).map((item) => {
                const value = item.key || item.id || item.name || "ENG";
                return (
                  <DropdownMenuItem key={value} className={linearMenuItemClass(value === team)} onClick={() => {
                    setTeam(value);
                    setActiveMenu(null);
                  }}>
                    {item.name || value}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-[15px] text-[#8d9097]">›</span>
          <DialogTitle className="flex-1 text-[14px] font-medium leading-none text-[#24262b]">New issue</DialogTitle>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Expand" className="absolute right-11 top-3 z-[70] size-6 rounded-md text-[#656872] hover:bg-[#f2f3f5] [&_svg]:size-3.5">
            <Maximize2 />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 z-[70] size-6 rounded-md text-[#656872] hover:bg-[#f2f3f5] [&_svg]:size-3.5"
          >
            <a
              href={closeHref}
              aria-label="Close"
              data-testid="quick-create-close"
              onClick={handleClose}
            >
              <X />
            </a>
          </Button>
        </DialogHeader>

        <form id="quick-create-form" className="grid gap-0 px-2.5 pb-0 pt-2" onSubmit={submit}>
          <ErrorBanner message={error} />
          <Input
            className="h-8 border-0 px-1 text-[17px] font-semibold leading-8 text-[#202124] shadow-none placeholder:text-[#a2a3a9] focus-visible:ring-0 md:text-[17px]"
            aria-label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            data-testid="create-issue-title"
            autoFocus
          />
          <Input
            className="mt-1 h-8 border-0 px-1 text-[15px] text-[#34363c] shadow-none placeholder:text-[#9b9da4] focus-visible:ring-0 md:text-[15px]"
            aria-label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description..."
            data-testid="create-issue-description"
          />

          <div
            className="mt-[53px] flex flex-wrap items-center gap-1.5"
            onPointerDownCapture={(event) => {
              if (event.button !== 0 || event.ctrlKey) return;
              const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-quick-create-menu]");
              if (!trigger) return;
              const menu = trigger.dataset.quickCreateMenu as Exclude<QuickCreateMenu, null> | undefined;
              if (!menu) return;
              event.preventDefault();
              if (activeMenu && activeMenu !== menu) {
                menuHandoffUntil.current = Date.now() + 250;
                setActiveMenu(null);
                window.setTimeout(() => setActiveMenu(menu), 0);
                return;
              }
              setActiveMenu((current) => (current === menu ? null : menu));
            }}
          >
            <PropertyMenu
              icon={<StatusIcon status={status} size={14} />}
              label={status}
              testId="create-issue-status"
              menuKey="status"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-status-menu"
              contentClassName="w-[270px]"
            >
              <MenuHeader label="Change status..." shortcut="S" />
              {statusOptions.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  className={linearMenuItemClass(item.label === status)}
                  onClick={() => {
                    setStatus(item.label);
                    setActiveMenu(null);
                  }}
                >
                  <StatusIcon status={item.label} size={15} />
                  {item.label}
                  {item.label === status && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                  <MenuShortcut>{item.shortcut}</MenuShortcut>
                </DropdownMenuItem>
              ))}
            </PropertyMenu>
            <PropertyMenu
              icon={<PriorityIcon priority={priority || undefined} />}
              label={priority || "Priority"}
              testId="create-issue-priority"
              menuKey="priority"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-priority-menu"
              contentClassName="w-[224px]"
            >
              <MenuHeader label="Set priority to..." shortcut="P" />
              {priorityOptions.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  className={linearMenuItemClass(item.value === priority)}
                  onClick={() => {
                    setPriority(item.value);
                    setActiveMenu(null);
                  }}
                >
                  <PriorityIcon priority={item.value || undefined} />
                  {item.label}
                  {item.value === priority && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                  <MenuShortcut>{item.shortcut}</MenuShortcut>
                </DropdownMenuItem>
              ))}
            </PropertyMenu>
            <PropertyMenu
              icon={<User />}
              label={assigneeId ? userName(users.find((user) => (user.id || user.username) === assigneeId)) || assigneeId : "Assignee"}
              testId="create-issue-assignee"
              menuKey="assignee"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-assignee-menu"
              contentClassName="w-[360px] max-h-[min(440px,calc(100vh-8rem))] overflow-hidden"
            >
              <MenuHeader label="Assign to..." shortcut="A" />
              <div className="border-b border-[#eeeef0] px-2 py-2">
                <Input
                  value={assigneeQuery}
                  onChange={(event) => setAssigneeQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder="Search users..."
                  className="h-8 rounded-lg border-[#dedfe3] bg-[#f7f7f8] px-2.5 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-[#5f63d8]"
                  data-testid="quick-create-assignee-search"
                />
              </div>
              <DropdownMenuItem
                className={linearMenuItemClass(!assigneeId)}
                onClick={() => {
                  setAssigneeId("");
                  setAssigneeQuery("");
                  setActiveMenu(null);
                }}
              >
                <AvatarDot label="No assignee" muted />
                No assignee
                {!assigneeId && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                <MenuShortcut>0</MenuShortcut>
              </DropdownMenuItem>
              <div className="max-h-[272px] overflow-y-auto overscroll-contain pr-1" data-testid="quick-create-assignee-scroll">
                {filteredAssignees.length > 0 && <div className="px-3 pb-1 pt-2 text-[12px] font-medium text-[#777a82]">Team members</div>}
                {filteredAssignees.map((user, index) => {
                  const value = user.id || user.username || "";
                  const name = userName(user);
                  return (
                    <DropdownMenuItem
                      key={value}
                      className={linearMenuItemClass(value === assigneeId)}
                      onClick={() => {
                        setAssigneeId(value);
                        setAssigneeQuery("");
                        setActiveMenu(null);
                      }}
                    >
                      <AvatarDot label={name} />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {value === assigneeId && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                      <MenuShortcut>{index + 1}</MenuShortcut>
                    </DropdownMenuItem>
                  );
                })}
                {filteredAssignees.length === 0 && (
                  <div className="px-3 py-6 text-center text-[13px] text-[#777a82]">No users found</div>
                )}
              </div>
            </PropertyMenu>
            <PropertyMenu
              icon={<Folder />}
              label={projectId ? projectTitle(projects.find((project) => (project.id || project.key) === projectId)) || projectId : "Project"}
              testId="create-issue-project"
              menuKey="project"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-project-menu"
              contentClassName="w-[292px] max-h-[360px]"
            >
              <DropdownMenuItem
                className={linearMenuItemClass(!projectId)}
                onClick={() => {
                  setProjectId("");
                  setActiveMenu(null);
                }}
              >
                <CircleDashed size={15} />
                No project
                {!projectId && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                <MenuShortcut>0</MenuShortcut>
              </DropdownMenuItem>
              {projects.map((project) => {
                const value = project.id || project.key || "";
                return (
                  <DropdownMenuItem
                    key={value}
                    className={linearMenuItemClass(value === projectId)}
                    onClick={() => {
                      setProjectId(value);
                      setActiveMenu(null);
                    }}
                  >
                    <Folder size={15} className="text-[#a6aab1]" />
                    <span className="min-w-0 flex-1 whitespace-normal leading-5">{projectTitle(project)}</span>
                    {value === projectId && <Check aria-hidden className="ml-auto size-4 text-[#25262b]" />}
                  </DropdownMenuItem>
                );
              })}
            </PropertyMenu>
            <PropertyMenu
              icon={<Tag />}
              label="Labels"
              testId="create-issue-labels"
              menuKey="labels"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-labels-menu"
              contentClassName="w-[520px] overflow-visible p-0"
            >
              <div className="flex">
                <div className="w-[250px] border-r border-[#dedfe3]">
                  <MenuHeader label="Add labels..." shortcut="L" />
                  <div className="p-1.5">
                    {labelOptions.map((item) => {
                      const selected = labelDetail?.name === item.name;
                      return (
                        <DropdownMenuItem
                          key={item.id || item.name}
                          className={linearMenuItemClass(selected)}
                          onSelect={(event) => {
                            event.preventDefault();
                            setSelectedLabel(item);
                            setActiveMenu(null);
                          }}
                        >
                          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: labelColor(item) }} />
                          {item.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </div>
                <div className="w-[270px] p-4" data-testid="quick-create-label-detail">
                  <div className="flex h-9 items-center gap-3 text-[15px] font-medium text-[#24262b]">
                    <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: labelColor(labelDetail) }} />
                    {labelDetail?.name || "Label"}
                  </div>
                  <div className="mt-3 border-t border-[#dedfe3] pt-3">
                    <div className="flex items-center gap-2 text-[13px] text-[#656872]">
                      <ListPlus size={14} />
                      <span>0 labelled issues</span>
                      <span className="ml-auto flex items-center gap-2">
                        <Building2 size={14} />
                        Workspace
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </PropertyMenu>
            <PropertyMenu
              icon={<MoreHorizontal />}
              label=""
              ariaLabel="More properties"
              iconOnly
              testId="create-issue-more"
              menuKey="more"
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              shouldIgnoreClose={shouldIgnoreMenuClose}
              contentTestId="quick-create-more-menu"
              contentClassName="w-[248px] overflow-visible"
            >
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="quick-create-due-date-trigger" className={linearMenuItemClass(false)}>
                  <SquarePlus size={15} />
                  <span>Set due date</span>
                  <MenuShortcut>⇧ D</MenuShortcut>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent data-testid="quick-create-due-date-menu" className="w-[260px] rounded-[14px] border-[#dedfe3] bg-white p-1.5 text-[#23252a] shadow-[0_14px_34px_rgba(17,18,22,0.18)] ring-0">
                  <div className="px-3 pb-2 pt-1.5 text-[13px] text-[#9a9da4]">Try: 24h, 7 days, Feb 9</div>
                  <DropdownMenuItem className={linearMenuItemClass(false)}><CalendarDays size={15} />Custom...</DropdownMenuItem>
                  <DropdownMenuItem className={linearMenuItemClass(false)}><CalendarDays size={15} />Tomorrow<MenuShortcut>{tomorrowLabel}</MenuShortcut></DropdownMenuItem>
                  <DropdownMenuItem className={linearMenuItemClass(false)}><CalendarDays size={15} />In one week<MenuShortcut>{nextWeekLabel}</MenuShortcut></DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className={linearMenuItemClass(false)}><Repeat2 size={15} />Make recurring...</DropdownMenuItem>
              <DropdownMenuItem className={linearMenuItemClass(false)}><Link2 size={15} />Add link...<MenuShortcut>Ctrl L</MenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator className="mx-0 my-1 bg-[#ececef]" />
              <DropdownMenuItem className={linearMenuItemClass(false)}><ListPlus size={15} />Add sub-issue<MenuShortcut>⌘ ⇧ O</MenuShortcut></DropdownMenuItem>
            </PropertyMenu>
          </div>

          <div className="-mx-2.5 mt-[21px] flex h-12 items-center gap-3 px-2.5 pb-3 pt-1">
            <Button type="button" variant="outline" size="icon-sm" aria-label="Attach file" className="size-8 rounded-full border-[#e3e4e8] bg-white text-[#5f626a] shadow-[0_1px_3px_rgba(15,16,20,0.08)] hover:bg-[#f7f7f8] [&_svg]:size-3.5">
              <Paperclip />
            </Button>
            <Button type="submit" form="quick-create-form" disabled={submitting} data-testid="create-issue-submit" className="ml-auto h-8 rounded-full bg-[#5f63d8] px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-[#5357ca]">
              {submitting ? "Creating..." : "Create issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PropertyMenu({
  icon,
  label,
  children,
  testId,
  menuKey,
  activeMenu,
  setActiveMenu,
  shouldIgnoreClose,
  contentTestId,
  contentClassName = "",
  iconOnly = false,
  ariaLabel,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  testId?: string;
  menuKey: QuickCreateMenu;
  activeMenu: QuickCreateMenu;
  setActiveMenu: Dispatch<SetStateAction<QuickCreateMenu>>;
  shouldIgnoreClose?: () => boolean;
  contentTestId?: string;
  contentClassName?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
}) {
  return (
    <DropdownMenu
      modal={false}
      open={activeMenu === menuKey}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && shouldIgnoreClose?.()) return;
        setActiveMenu((current) => {
          if (nextOpen) return menuKey;
          return current === menuKey ? null : current;
        });
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon-sm" : "sm"}
          aria-label={ariaLabel || label}
          data-testid={testId}
          data-quick-create-menu={menuKey}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setActiveMenu(activeMenu === menuKey ? null : menuKey);
          }}
          className={iconOnly ? "size-7 rounded-full border-[#dfe0e4] bg-white text-[#60636b] shadow-none hover:bg-[#f6f6f7] [&_svg]:size-3.5" : "h-7 gap-1.5 rounded-full border-[#dfe0e4] bg-white px-2.5 text-[13px] font-medium text-[#575a62] shadow-none hover:bg-[#f6f6f7] [&_svg]:size-3.5 [&_svg]:text-[#6f727a]"}
        >
          {icon}
          {!iconOnly && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        data-testid={contentTestId}
        className={`max-h-[360px] rounded-[14px] border-[#dedfe3] bg-white p-1.5 text-[#23252a] shadow-[0_14px_34px_rgba(17,18,22,0.18)] ring-0 data-[state=closed]:hidden ${contentClassName}`}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuHeader({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-[#eeeef0] px-3 text-[13px] font-medium text-[#8d9097]">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <span className="inline-flex size-5 items-center justify-center rounded-md border border-[#e1e2e6] text-[12px] text-[#777a82]">{shortcut}</span>}
    </div>
  );
}

function MenuShortcut({ children }: { children: ReactNode }) {
  return <span aria-hidden className="ml-auto shrink-0 pl-3 text-right text-[13px] text-[#686b73]">{children}</span>;
}

function AvatarDot({ label, muted = false }: { label: string; muted?: boolean }) {
  if (muted) {
    return (
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[#6d7078]">
        <User size={13} />
      </span>
    );
  }

  return (
    <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: avatarColor(label) }}>
      {initials(label)}
    </span>
  );
}

function linearMenuItemClass(active: boolean) {
  return `min-h-9 cursor-default gap-2 rounded-[9px] px-2.5 py-2 text-[14px] font-medium text-[#2b2d33] outline-none focus:bg-[#f1f1f2] ${active ? "bg-[#f1f1f2]" : ""}`;
}

function mergeLabels(labels: Label[]) {
  const seen = new Set<string>();
  return [...defaultLabels, ...labels]
    .filter((label) => {
      const key = (label.name || label.id || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function labelColor(label: Label | null | undefined) {
  return label?.color || "#a970ff";
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function avatarColor(name: string) {
  const colors = ["#51c3d3", "#d3ad47", "#5f8d39", "#7a8be8", "#bf6f48", "#8c6bd6"];
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function formatDueDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
