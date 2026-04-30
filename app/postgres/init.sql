-- Linear clone schema.
-- Text IDs are deliberate: they keep agent tasks and verifier SQL readable.

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'standard',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL DEFAULT 'box',
    color TEXT NOT NULL DEFAULT '#5e6ad2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE workflow_states (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8a8f98',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'roadmap',
    color TEXT NOT NULL DEFAULT '#5e6ad2',
    state TEXT NOT NULL DEFAULT 'planned',
    status TEXT NOT NULL DEFAULT 'planned',
    priority TEXT NOT NULL DEFAULT 'none',
    lead_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    target_date DATE,
    health TEXT NOT NULL DEFAULT 'unknown',
    progress INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE project_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_project_milestones_project ON project_milestones(project_id);

CREATE TABLE project_members (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE cycles (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    state TEXT NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE issues (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    identifier TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    state_id TEXT REFERENCES workflow_states(id) ON DELETE SET NULL,
    status_id TEXT,
    priority TEXT NOT NULL DEFAULT 'none',
    estimate INTEGER,
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    cycle_id TEXT REFERENCES cycles(id) ON DELETE SET NULL,
    parent_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    due_date DATE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trashed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    UNIQUE (team_id, number)
);

CREATE TABLE labels (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#5e6ad2',
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    parent_label_id TEXT REFERENCES labels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issue_labels (
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE issue_relations (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    related_issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'related',
    source_issue_id TEXT,
    target_issue_id TEXT,
    relation_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issue_subscriptions (
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);

CREATE TABLE issue_comments (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

CREATE TABLE issue_activity (
    id TEXT PRIMARY KEY,
    issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    health TEXT NOT NULL DEFAULT 'on_track',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE views (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    group_by TEXT NOT NULL DEFAULT 'status',
    order_by TEXT NOT NULL DEFAULT 'updated',
    layout TEXT NOT NULL DEFAULT 'list',
    icon TEXT NOT NULL DEFAULT 'list-filter',
    color TEXT NOT NULL DEFAULT '#5e6ad2',
    shared BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE initiatives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'planned',
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE initiative_projects (
    initiative_id TEXT NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (initiative_id, project_id)
);

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES issue_comments(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issue_templates (
    id TEXT PRIMARY KEY,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'Business',
    revenue INTEGER NOT NULL DEFAULT 0,
    size TEXT NOT NULL DEFAULT 'Mid-market',
    status TEXT NOT NULL DEFAULT 'active',
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_requests (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    issue_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    requester_name TEXT NOT NULL,
    body TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    important BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issues_team_state ON issues(team_id, state_id);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_cycle ON issues(cycle_id);
CREATE INDEX idx_comments_issue ON issue_comments(issue_id);
CREATE INDEX idx_activity_issue ON issue_activity(issue_id);

CREATE VIEW comments AS
SELECT id, issue_id, author_id, body, created_at, updated_at, edited_at, NULL::TIMESTAMPTZ AS deleted_at
FROM issue_comments;

CREATE VIEW activity_events AS
SELECT id,
       'issue'::TEXT AS entity_type,
       issue_id AS entity_id,
       actor_id,
       kind AS action,
       jsonb_build_object('from', from_value, 'to', to_value, 'kind', kind) AS details,
       created_at,
       updated_at
FROM issue_activity;

CREATE VIEW saved_views AS
SELECT id,
       owner_id,
       name,
       CASE WHEN shared THEN 'shared' ELSE 'personal' END AS scope,
       filter_json AS filters_json,
       jsonb_build_object('group_by', group_by, 'order_by', order_by, 'layout', layout) AS display_json,
       created_at,
       updated_at
FROM views;

CREATE VIEW inbox_notifications AS
SELECT id,
       recipient_id AS user_id,
       issue_id,
       kind AS type,
       CASE
           WHEN archived_at IS NOT NULL THEN 'archived'
           WHEN read_at IS NOT NULL THEN 'read'
           ELSE 'unread'
       END AS status,
       read_at,
       archived_at,
       created_at,
       updated_at
FROM notifications;
