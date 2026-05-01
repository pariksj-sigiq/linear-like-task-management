import { useCallback, useEffect, useState } from "react";
import { Filter, PanelRight, Plus, SlidersHorizontal } from "lucide-react";
import { IssueExplorer } from "../IssueExplorer";
import { Button } from "../ui/button";
import type { Project } from "../../linearTypes";
import { projectTitle } from "../../linearTypes";

interface ProjectIssuesTabProps {
  project: Project;
  onChange: () => void | Promise<void>;
}

function dispatchQuickCreateForProject(projectId?: string) {
  window.dispatchEvent(
    new CustomEvent("linear:quick-create", { detail: { projectId } }),
  );
}

export function ProjectIssuesTab({ project, onChange }: ProjectIssuesTabProps) {
  const projectId = project.id || project.key || "";
  const [reloadKey, setReloadKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setReloadKey((k) => k + 1);
    void onChange();
  }, [onChange]);

  useEffect(() => {
    const onIssueCreated = () => handleRefresh();
    window.addEventListener("linear:issue-created", onIssueCreated);
    return () => window.removeEventListener("linear:issue-created", onIssueCreated);
  }, [handleRefresh]);

  return (
    <section className="flex h-full w-full flex-col" data-testid="project-issues-tab">
      <div className="flex h-12 shrink-0 items-center justify-end gap-1.5 border-b border-border px-6">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Filter"
          className="size-7 rounded-md border-border bg-background hover:bg-muted"
          data-testid="project-issues-filter"
        >
          <Filter size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Display options"
          className="size-7 rounded-md border-border bg-background hover:bg-muted"
          data-testid="project-issues-display"
        >
          <SlidersHorizontal size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Toggle sidebar"
          className="size-7 rounded-md border-border bg-background hover:bg-muted"
        >
          <PanelRight size={14} />
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-7 gap-1.5 rounded-md px-2.5 text-[13px] font-medium"
          data-testid="project-issues-create"
          onClick={() => dispatchQuickCreateForProject(projectId)}
        >
          <Plus size={14} />
          Create issue
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="px-6 py-4">
          <IssueExplorer
            key={`project-issues-${projectId}-${reloadKey}`}
            title=""
            showHeader={false}
            showCreateAction={false}
            defaultTab="all"
            issueNavigationState={() => ({
              source: "project",
              from: `/project/${projectId}/issues`,
              fromLabel: projectTitle(project),
            })}
            params={{ project_id: projectId }}
          />
        </div>
      </div>
    </section>
  );
}
