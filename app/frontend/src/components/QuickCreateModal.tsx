import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Folder, Maximize2, MoreHorizontal, Paperclip, Tag, User, X } from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { LinearUser, Project, Team } from "../linearTypes";
import { issueKey, projectTitle, userName } from "../linearTypes";
import { PriorityIcon, StatusIcon } from "./IssueExplorer";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { ErrorBanner } from "./ui";

const statuses = ["Backlog", "Todo", "In Progress", "Done", "Canceled"];
const priorities = ["Urgent", "High", "Medium", "Low", "No priority"];

export function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const wasOpen = useRef(open);
  const [dismissed, setDismissed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState("ENG");
  const [status, setStatus] = useState("Todo");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) setDismissed(false);
    if (!open) setDismissed(false);
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      readTool("list_teams"),
      readTool("search_projects", { limit: 50 }),
      readTool("search_users", { limit: 50 }),
    ]).then(([teamResponse, projectResponse, userResponse]) => {
      const nextTeams = collectionFrom<Team>(teamResponse.data, ["teams", "results"]);
      setTeams(nextTeams);
      const routeTeam = location.pathname.match(/\/team\/([^/]+)/)?.[1]?.toUpperCase();
      const validTeam = nextTeams.find((item) => (item.key || item.id || item.name || "").toUpperCase() === team.toUpperCase());
      const routeTeamOption = nextTeams.find((item) => (item.key || item.id || item.name || "").toUpperCase() === routeTeam);
      const fallbackTeam = routeTeamOption || validTeam || nextTeams[0];
      if (fallbackTeam) setTeam(fallbackTeam.key || fallbackTeam.id || fallbackTeam.name || "ENG");
      setProjects(collectionFrom<Project>(projectResponse.data, ["projects", "results"]));
      setUsers(collectionFrom<LinearUser>(userResponse.data, ["users", "results"]));
    });
  }, [location.pathname, open, team]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("Todo");
    setPriority("");
    setProjectId("");
    setAssigneeId("");
    setError(null);
  };

  const handleClose = () => {
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
      priority: priority || undefined,
      project_id: projectId,
      assignee_id: assigneeId,
    });
    setSubmitting(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const data = response.data as Record<string, unknown> | null;
    const issue = (data?.issue || data) as Parameters<typeof issueKey>[0];
    reset();
    if (!createMore) handleClose();
    if (issue) navigate(`/issue/${issueKey(issue)}`);
  };

  return (
    <Dialog open={visible} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="z-[60] top-[27.6%] w-[min(738px,calc(100vw-2rem))] max-w-[738px] gap-0 overflow-hidden rounded-[20px] border border-[#d8d9dd] bg-white p-0 text-[#1f2023] shadow-[0_22px_54px_rgba(18,19,22,0.28)] ring-0 sm:max-w-[738px]"
        data-testid="quick-create-modal"
      >
        <DialogHeader className="h-12 flex-row items-center gap-2 px-2.5 py-0 pr-[76px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="xs" className="h-7 gap-1.5 rounded-[9px] border-[#e0e1e5] bg-white px-2 text-[13px] font-medium text-[#62656c] shadow-none hover:bg-[#f7f7f8]">
                <span className="flex size-4 items-center justify-center rounded-[5px] bg-[#eef1ff] text-[10px] font-semibold text-[#6d78e8]">
                  {team.slice(0, 1)}
                </span>
                {team}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(teams.length ? teams : [{ key: "ENG", name: "ENG" } as Team]).map((item) => {
                const value = item.key || item.id || item.name || "ENG";
                return (
                  <DropdownMenuItem key={value} onClick={() => setTeam(value)}>
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

          <div className="mt-[53px] flex flex-wrap items-center gap-1.5">
            <PropertyMenu icon={<StatusIcon status={status} size={14} />} label={status}>
              {statuses.map((item) => (
                <DropdownMenuItem key={item} onClick={() => setStatus(item)}>
                  {item}
                </DropdownMenuItem>
              ))}
            </PropertyMenu>
            <PropertyMenu icon={<PriorityIcon priority={priority || undefined} />} label={priority || "Priority"}>
              {priorities.map((item) => (
                <DropdownMenuItem key={item} onClick={() => setPriority(item === "No priority" ? "" : item)}>
                  {item}
                </DropdownMenuItem>
              ))}
            </PropertyMenu>
            <PropertyMenu
              icon={<User />}
              label={assigneeId ? userName(users.find((user) => (user.id || user.username) === assigneeId)) || assigneeId : "Assignee"}
            >
              <DropdownMenuItem onClick={() => setAssigneeId("")}>No assignee</DropdownMenuItem>
              {users.map((user) => {
                const value = user.id || user.username || "";
                return (
                  <DropdownMenuItem key={value} onClick={() => setAssigneeId(value)}>
                    {userName(user)}
                  </DropdownMenuItem>
                );
              })}
            </PropertyMenu>
            <PropertyMenu
              icon={<Folder />}
              label={projectId ? projectTitle(projects.find((project) => (project.id || project.key) === projectId)) || projectId : "Project"}
            >
              <DropdownMenuItem onClick={() => setProjectId("")}>No project</DropdownMenuItem>
              {projects.map((project) => {
                const value = project.id || project.key || "";
                return (
                  <DropdownMenuItem key={value} onClick={() => setProjectId(value)}>
                    {projectTitle(project)}
                  </DropdownMenuItem>
                );
              })}
            </PropertyMenu>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 rounded-full border-[#dfe0e4] bg-white px-2.5 text-[13px] font-medium text-[#575a62] shadow-none hover:bg-[#f6f6f7] [&_svg]:size-3.5 [&_svg]:text-[#6f727a]">
              <Tag />
              Labels
            </Button>
            <Button type="button" variant="outline" size="icon-sm" aria-label="More properties" className="size-7 rounded-full border-[#dfe0e4] bg-white text-[#60636b] shadow-none hover:bg-[#f6f6f7] [&_svg]:size-3.5">
              <MoreHorizontal />
            </Button>
          </div>

          <div className="-mx-2.5 mt-[21px] flex h-12 items-center gap-3 px-2.5 pb-3 pt-1">
            <Button type="button" variant="outline" size="icon-sm" aria-label="Attach file" className="size-8 rounded-full border-[#e3e4e8] bg-white text-[#5f626a] shadow-[0_1px_3px_rgba(15,16,20,0.08)] hover:bg-[#f7f7f8] [&_svg]:size-3.5">
              <Paperclip />
            </Button>
            <label className="ml-auto flex items-center gap-2 text-[13px] font-medium text-[#64666e]">
              <Checkbox checked={createMore} onCheckedChange={(checked) => setCreateMore(checked === true)} className="h-3.5 w-[22px] rounded-full border-transparent bg-[#c7c9ce] text-transparent shadow-none before:absolute before:left-0.5 before:size-2.5 before:rounded-full before:bg-white before:transition-transform before:content-[''] data-[state=checked]:border-transparent data-[state=checked]:bg-[#5f63d8] data-[state=checked]:before:translate-x-2 [&_[data-slot=checkbox-indicator]]:hidden" />
              <span>Create more</span>
            </label>
            <Button type="submit" form="quick-create-form" disabled={submitting} data-testid="create-issue-submit" className="h-8 rounded-full bg-[#5f63d8] px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-[#5357ca]">
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
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 rounded-full border-[#dfe0e4] bg-white px-2.5 text-[13px] font-medium text-[#575a62] shadow-none hover:bg-[#f6f6f7] [&_svg]:size-3.5 [&_svg]:text-[#6f727a]">
          {icon}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
