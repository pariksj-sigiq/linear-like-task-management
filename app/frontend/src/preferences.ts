export interface UserPreferences {
  user_id?: string;
  default_home_view: string;
  display_names: string;
  first_day_of_week: string;
  convert_emoticons: boolean;
  send_comment_shortcut: string;
  font_size: string;
  theme: string;
  use_pointer_cursors: boolean;
  compact_issue_rows: boolean;
  sidebar_counts: boolean;
  open_at_login: boolean;
  default_workspace_id?: string | null;
}

export const PREFERENCE_EVENT = "linear:preferences-updated";

export const defaultPreferences: UserPreferences = {
  default_home_view: "Active issues",
  display_names: "Full name",
  first_day_of_week: "Sunday",
  convert_emoticons: true,
  send_comment_shortcut: "⌘+Enter",
  font_size: "Default",
  theme: "System",
  use_pointer_cursors: false,
  compact_issue_rows: false,
  sidebar_counts: true,
  open_at_login: true,
  default_workspace_id: null,
};

export function normalizePreferences(raw: unknown): UserPreferences {
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    ...defaultPreferences,
    user_id: stringValue(record.user_id),
    default_home_view: stringValue(record.default_home_view) || defaultPreferences.default_home_view,
    display_names: stringValue(record.display_names) || defaultPreferences.display_names,
    first_day_of_week: stringValue(record.first_day_of_week) || defaultPreferences.first_day_of_week,
    convert_emoticons: boolValue(record.convert_emoticons, defaultPreferences.convert_emoticons),
    send_comment_shortcut: shortcutValue(record.send_comment_shortcut),
    font_size: stringValue(record.font_size) || defaultPreferences.font_size,
    theme: stringValue(record.theme) || defaultPreferences.theme,
    use_pointer_cursors: boolValue(record.use_pointer_cursors, defaultPreferences.use_pointer_cursors),
    compact_issue_rows: boolValue(record.compact_issue_rows, defaultPreferences.compact_issue_rows),
    sidebar_counts: boolValue(record.sidebar_counts, defaultPreferences.sidebar_counts),
    open_at_login: boolValue(record.open_at_login, defaultPreferences.open_at_login),
    default_workspace_id: stringValue(record.default_workspace_id) || null,
  };
}

export function applyUserPreferences(preferences: UserPreferences) {
  const root = document.documentElement;
  const requestedTheme = preferences.theme.toLowerCase();
  const resolvedTheme = requestedTheme === "dark" || requestedTheme === "light"
    ? requestedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  root.dataset.theme = resolvedTheme;
  root.dataset.linearFontSize = preferences.font_size.toLowerCase();
  root.dataset.linearCompactRows = String(preferences.compact_issue_rows);
  root.dataset.linearPointerCursors = String(preferences.use_pointer_cursors);
  root.classList.toggle("linear-dark", resolvedTheme === "dark");
  root.classList.toggle("dark", resolvedTheme === "dark");
  window.localStorage.setItem("linear-preferences", JSON.stringify(preferences));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function shortcutValue(value: unknown) {
  const shortcut = stringValue(value);
  if (shortcut === "Cmd+Enter") return "⌘+Enter";
  return shortcut || defaultPreferences.send_comment_shortcut;
}

function boolValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
