import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Bell,
  CircleDot,
  FolderKanban,
  Inbox,
  Kanban,
  Plus,
  Search,
  Settings,
  UserRoundCheck,
} from "lucide-react";
import { collectionFrom, readTool } from "../api";
import type { SearchResult } from "../linearTypes";
import { issueKey, issueTitle, projectTitle } from "../linearTypes";
import { Button, Kbd, ModalShell } from "./ui";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onQuickCreate: () => void;
}

const baseCommands = [
  { label: "Open Inbox", path: "/inbox", icon: Inbox },
  { label: "Open My Issues", path: "/my-issues", icon: UserRoundCheck },
  { label: "Open Views", path: "/views", icon: Kanban },
  { label: "Open Projects", path: "/projects", icon: FolderKanban },
  { label: "Open Roadmap", path: "/roadmap", icon: CircleDot },
  { label: "Open Archive", path: "/archive", icon: Archive },
  { label: "Workspace settings", path: "/settings/workspace", icon: Settings },
];

export function CommandPalette({ open, onClose, onQuickCreate }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const response = await readTool("global_search", { query, limit: 8 });
      setResults(collectionFrom<SearchResult>(response.data, ["results", "items"]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const filteredCommands = useMemo(
    () =>
      baseCommands.filter((command) =>
        command.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  if (!open) return null;

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const openResult = (result: SearchResult) => {
    if (result.url) {
      go(result.url);
      return;
    }
    if (result.issue) {
      go(`/issue/${issueKey(result.issue)}`);
      return;
    }
    if (result.project) {
      go(`/projects/${result.project.id || result.project.key}`);
      return;
    }
    if (result.type === "issue" || result.key) {
      go(`/issue/${result.key || result.id}`);
      return;
    }
    if (result.type === "project") {
      go(`/projects/${result.id || result.key}`);
      return;
    }
    go("/search");
  };

  return (
    <ModalShell title="Command menu" onClose={onClose} testId="command-palette">
      <div className="field-stack">
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: 9, color: "var(--text-muted)" }} />
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search issues, projects, or commands"
            autoFocus
            style={{ paddingLeft: 34 }}
            data-testid="command-palette-input"
          />
        </div>
        <div className="command-list">
          <button
            className="command-item"
            onClick={() => {
              onClose();
              onQuickCreate();
            }}
            data-testid="command-create-issue"
          >
            <Plus size={16} />
            <span>New issue</span>
            <Kbd>C</Kbd>
          </button>

          {results.map((result) => (
            <button
              key={`${result.type || "result"}-${result.id || result.key || result.title || result.name}`}
              className="command-item"
              onClick={() => openResult(result)}
            >
              <Bell size={16} />
              <span className="truncate">
                {result.issue ? issueTitle(result.issue) : result.project ? projectTitle(result.project) : result.title || result.name || result.key || "Result"}
              </span>
              <span className="issue-key">{result.type || "result"}</span>
            </button>
          ))}

          {filteredCommands.map((command) => (
            <button key={command.path} className="command-item" onClick={() => go(command.path)}>
              <command.icon size={16} />
              <span>{command.label}</span>
              <span className="issue-key">{command.path}</span>
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
