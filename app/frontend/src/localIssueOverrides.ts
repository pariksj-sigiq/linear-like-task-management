import type { Issue } from "./linearTypes";
import { issueKey } from "./linearTypes";

const STORAGE_KEY = "linear-local-issue-overrides";
const CHANGE_EVENT = "linear:issue-overrides-change";

type IssueOverride = Partial<Issue>;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readOverrides(): Record<string, IssueOverride> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getIssueOverride(key: string | null | undefined): IssueOverride | null {
  if (!key) return null;
  return readOverrides()[key] || null;
}

export function mergeIssueOverride(issue: Issue): Issue {
  const override = getIssueOverride(issueKey(issue));
  return override ? { ...issue, ...override } : issue;
}

export function mergeIssueOverrides(issues: Issue[]): Issue[] {
  return issues.map((issue) => mergeIssueOverride(issue));
}

export function saveIssueOverride(key: string, changes: IssueOverride) {
  if (!canUseStorage()) return;
  const current = readOverrides();
  const next = {
    ...current,
    [key]: {
      ...(current[key] || {}),
      ...changes,
    },
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key, changes } }));
}

export function subscribeIssueOverrides(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  const onLocalChange = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocalChange);
  };
}
