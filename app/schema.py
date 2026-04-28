"""Pydantic schemas for the Linear clone tool server."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel
from pydantic import Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class EmptyArgs(BaseModel):
    pass


class SearchArgs(BaseModel):
    query: str | None = None
    limit: int = Field(default=50, ge=1, le=250)


class IdArgs(BaseModel):
    id: str


class WorkspaceArgs(BaseModel):
    name: str
    url_key: str


class TeamArgs(BaseModel):
    name: str
    key: str
    icon: str = "box"
    color: str = "#5e6ad2"
    workspace_id: str = "wks_001"


class TeamSearchArgs(SearchArgs):
    workspace_id: str | None = None


class TeamMemberArgs(BaseModel):
    team_id: str
    user_id: str
    role: str = "member"


class WorkflowStateArgs(BaseModel):
    team_id: str
    name: str
    category: str
    color: str = "#8a8f98"
    position: int = 0


class UpdateWorkflowStateArgs(BaseModel):
    id: str
    name: str | None = None
    category: str | None = None
    color: str | None = None
    position: int | None = None


class ReorderWorkflowStatesArgs(BaseModel):
    state_ids: list[str]


class LabelArgs(BaseModel):
    team_id: str
    name: str
    color: str = "#5e6ad2"
    parent_label_id: str | None = None


class UpdateLabelArgs(BaseModel):
    id: str
    name: str | None = None
    color: str | None = None
    parent_label_id: str | None = None


class ProjectArgs(BaseModel):
    name: str
    description: str | None = None
    icon: str = "roadmap"
    color: str = "#5e6ad2"
    state: str = "planned"
    health: str = "unknown"
    lead_id: str | None = None
    start_date: str | None = None
    target_date: str | None = None
    workspace_id: str = "wks_001"


class UpdateProjectArgs(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    state: str | None = None
    health: str | None = None
    lead_id: str | None = None
    start_date: str | None = None
    target_date: str | None = None


class ProjectUpdateArgs(BaseModel):
    project_id: str
    author_id: str = "user_001"
    body: str
    health: str = "on_track"


class CycleArgs(BaseModel):
    team_id: str
    number: int
    name: str
    start_date: str
    end_date: str
    state: str = "upcoming"


class UpdateCycleArgs(BaseModel):
    id: str
    name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    state: str | None = None


class IssueArgs(BaseModel):
    team_id: str
    title: str
    description: str | None = None
    state_id: str | None = None
    priority: str = "none"
    estimate: int | None = None
    assignee_id: str | None = None
    creator_id: str = "user_001"
    project_id: str | None = None
    cycle_id: str | None = None
    parent_id: str | None = None
    due_date: str | None = None
    label_ids: list[str] = Field(default_factory=list)


class UpdateIssueArgs(BaseModel):
    id: str
    title: str | None = None
    description: str | None = None
    state_id: str | None = None
    priority: str | None = None
    estimate: int | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    cycle_id: str | None = None
    parent_id: str | None = None
    due_date: str | None = None


class SearchIssuesArgs(SearchArgs):
    team_key: str | None = None
    state_category: str | None = None
    state_id: str | None = None
    priority: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    cycle_id: str | None = None
    label_id: str | None = None
    view_id: str | None = None
    include_archived: bool = False


class GetIssueArgs(BaseModel):
    id: str | None = None
    key: str | None = None


class IssueStateArgs(BaseModel):
    issue_id: str
    state_id: str


class IssueAssigneeArgs(BaseModel):
    issue_id: str
    assignee_id: str | None = None


class IssuePriorityArgs(BaseModel):
    issue_id: str
    priority: str


class IssueEstimateArgs(BaseModel):
    issue_id: str
    estimate: int | None = None


class IssueDueDateArgs(BaseModel):
    issue_id: str
    due_date: str | None = None


class IssueProjectArgs(BaseModel):
    issue_id: str
    project_id: str | None = None


class IssueCycleArgs(BaseModel):
    issue_id: str
    cycle_id: str | None = None


class IssueParentArgs(BaseModel):
    issue_id: str
    parent_id: str | None = None


class IssueLabelArgs(BaseModel):
    issue_id: str
    label_id: str


class BulkIssueArgs(BaseModel):
    issue_ids: list[str]
    state_id: str | None = None
    priority: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    cycle_id: str | None = None
    add_label_id: str | None = None
    archive: bool | None = None


class RelationArgs(BaseModel):
    issue_id: str
    related_issue_id: str
    type: str = "related"


class CommentArgs(BaseModel):
    issue_id: str
    author_id: str = "user_001"
    body: str


class EditCommentArgs(BaseModel):
    id: str
    body: str


class ViewArgs(BaseModel):
    name: str
    description: str | None = None
    owner_id: str = "user_001"
    team_id: str | None = None
    filter_json: dict[str, Any] = Field(default_factory=dict)
    group_by: str = "status"
    order_by: str = "updated"
    layout: str = "list"
    icon: str = "list-filter"
    color: str = "#5e6ad2"
    shared: bool = True


class UpdateViewArgs(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    filter_json: dict[str, Any] | None = None
    group_by: str | None = None
    order_by: str | None = None
    layout: str | None = None
    shared: bool | None = None


class NotificationArgs(BaseModel):
    recipient_id: str
    kind: str
    actor_id: str | None = None
    issue_id: str | None = None
    project_id: str | None = None
    comment_id: str | None = None


class NotificationActionArgs(BaseModel):
    id: str


class SnoozeNotificationArgs(BaseModel):
    id: str
    snoozed_until: str


class FavoriteArgs(BaseModel):
    user_id: str
    kind: str
    entity_id: str
    sort_order: int = 0


class TemplateArgs(BaseModel):
    team_id: str
    name: str
    payload_json: dict[str, Any]
    created_by: str = "user_001"


class InitiativeArgs(BaseModel):
    name: str
    description: str | None = None
    owner_id: str = "user_001"
    state: str = "planned"
    target_date: str | None = None
    project_ids: list[str] = Field(default_factory=list)


class CustomerArgs(BaseModel):
    name: str
    domain: str
    tier: str = "Business"
    revenue: int = 0
    size: str = "Mid-market"
    status: str = "active"
    owner_id: str | None = None


class CustomerRequestArgs(BaseModel):
    customer_id: str
    issue_id: str | None = None
    project_id: str | None = None
    requester_name: str
    body: str
    source: str = "manual"
    important: bool = False


class UserSearchArgs(SearchArgs):
    role: str | None = None
