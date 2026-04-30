import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  Box,
  Copy,
  Link2,
  MoreHorizontal,
  PanelRight,
  Star,
  Trash2,
} from "lucide-react";
import { readTool } from "../../api";
import { useAuth } from "../../auth";
import { cn } from "../../lib/utils";
import type { Project } from "../../linearTypes";
import { projectTitle } from "../../linearTypes";
import { Button } from "../ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface FavoriteRecord {
  id?: string;
  user_id?: string;
  kind?: string;
  entity_id?: string;
}

interface ProjectHeaderProps {
  project: Project;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onProjectDeleted: () => void;
}

const subscribeKey = (projectId: string) => `linear-clone:project-subscribe:${projectId}`;
const localFavoriteKey = (projectId: string) => `linear-clone:project-fav:${projectId}`;

export function ProjectHeader({
  project,
  sidebarOpen,
  onToggleSidebar,
  onProjectDeleted,
}: ProjectHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = project.id || "";
  const userId = user?.id || "";

  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favoriteLocal, setFavoriteLocal] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(localFavoriteKey(projectId)) === "1",
  );
  const [favoriteBackend, setFavoriteBackend] = useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(subscribeKey(projectId)) === "1",
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isFavorited = favoriteBackend || favoriteLocal;

  // Load favorites from backend (best-effort; falls back to localStorage).
  useEffect(() => {
    if (!userId || !projectId) return;
    let cancelled = false;
    (async () => {
      const response = await readTool<{ favorites?: FavoriteRecord[] }>("list_favorites", {
        query: userId,
        limit: 100,
      });
      if (cancelled) return;
      if (response.error) {
        // Unknown tool or error — rely on localStorage only.
        return;
      }
      const records = response.data?.favorites || [];
      const match = records.find(
        (record) => record.entity_id === projectId && (record.kind === "project" || record.kind === "projects"),
      );
      if (match?.id) {
        setFavoriteId(match.id);
        setFavoriteBackend(true);
      } else {
        setFavoriteId(null);
        setFavoriteBackend(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, userId]);

  const toggleFavorite = async () => {
    const nextFavorited = !isFavorited;

    // Optimistic local state.
    if (nextFavorited) {
      setFavoriteLocal(true);
      window.localStorage.setItem(localFavoriteKey(projectId), "1");
    } else {
      setFavoriteLocal(false);
      window.localStorage.removeItem(localFavoriteKey(projectId));
    }

    if (!userId || !projectId) return;

    if (nextFavorited) {
      const response = await readTool<FavoriteRecord>("add_favorite", {
        user_id: userId,
        kind: "project",
        entity_id: projectId,
      });
      if (!response.error && response.data?.id) {
        setFavoriteId(response.data.id);
        setFavoriteBackend(true);
      }
    } else if (favoriteId) {
      const response = await readTool("remove_favorite", { id: favoriteId });
      if (!response.error) {
        setFavoriteId(null);
        setFavoriteBackend(false);
      }
    }
  };

  const toggleSubscribe = () => {
    const next = !subscribed;
    setSubscribed(next);
    if (next) {
      window.localStorage.setItem(subscribeKey(projectId), "1");
    } else {
      window.localStorage.removeItem(subscribeKey(projectId));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn("Failed to copy link", error);
    }
  };

  const confirmDelete = async () => {
    if (!projectId) return;
    setDeleting(true);
    const response = await readTool("delete_project", { id: projectId });
    setDeleting(false);
    if (response.error) {
      console.error("Failed to delete project", response.error);
      return;
    }
    setDeleteOpen(false);
    onProjectDeleted();
    navigate("/projects/all");
  };

  return (
    <>
      <div
        className="group/header mb-3 flex h-8 items-center justify-between gap-3"
        data-testid="project-header"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <Link to="/projects/all" className="shrink-0 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Projects
          </Link>
          <span className="shrink-0 text-muted-foreground">›</span>
          <Box size={16} className="shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-[15px] font-medium" data-testid="project-breadcrumb-name">
            {projectTitle(project)}
          </span>
          <button
            type="button"
            className="ml-1 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground"
            aria-label={isFavorited ? "Unfavorite project" : "Favorite project"}
            onClick={toggleFavorite}
            data-testid="project-favorite-toggle"
          >
            <Star
              size={14}
              className={cn(isFavorited ? "fill-yellow-400 text-yellow-500" : "")}
            />
          </button>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground"
                aria-label="Project actions"
                data-testid="project-actions-trigger"
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem onSelect={copyLink} data-testid="project-action-copy-link">
                <Link2 size={14} className="mr-2" /> {copied ? "Link copied" : "Copy link"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleFavorite} data-testid="project-action-favorite">
                {isFavorited ? (
                  <>
                    <Star size={14} className="mr-2 fill-yellow-400 text-yellow-500" /> Unfavorite
                  </>
                ) : (
                  <>
                    <Star size={14} className="mr-2" /> Favorite
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleSubscribe} data-testid="project-action-subscribe">
                {subscribed ? (
                  <>
                    <BookmarkCheck size={14} className="mr-2" /> Unsubscribe
                  </>
                ) : (
                  <>
                    <Bookmark size={14} className="mr-2" /> Subscribe
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell size={14} className="mr-2" /> Remind me
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Change update schedule
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Configure Slack
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Show description history</DropdownMenuItem>
              <DropdownMenuItem disabled>Show updates and activity</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                data-testid="project-action-delete"
              >
                <Trash2 size={14} className="mr-2" /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" iconOnly aria-label="Copy page link" onClick={copyLink}>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Project notifications">
            <Bell size={14} />
          </Button>
          <Button
            variant="ghost"
            iconOnly
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            onClick={onToggleSidebar}
            data-testid="project-sidebar-toggle"
          >
            <PanelRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This permanently removes {projectTitle(project)} and its milestones. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              data-testid="project-delete-confirm"
            >
              {deleting ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
