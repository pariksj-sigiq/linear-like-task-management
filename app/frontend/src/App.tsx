import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { LinearShell } from "./components/LinearShell";
import { Login } from "./pages/Login";
import { IssuePage } from "./pages/IssuePage";
import {
  ArchivePage,
  CycleDetailPage,
  CyclesPage,
  GlobalSearchPage,
  HomePage,
  InboxPage,
  MyIssuesPage,
  ProjectDetailPage,
  ProjectsPage,
  TeamIssuesPage,
  TeamSettingsPage,
  TierTwoPage,
  ViewDetailPage,
  ViewsPage,
} from "./pages/WorkspacePages";

function ProtectedApp() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="linear-login"><p style={{ color: "var(--text-secondary)" }}>Loading...</p></div>;
  }

  if (location.pathname === "/login") {
    return user ? <Navigate to="/my-issues" replace /> : <Login />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <LinearShell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/my-issues" element={<MyIssuesPage />} />
        <Route path="/my-issues/assigned" element={<MyIssuesPage />} />
        <Route path="/my-issues/created" element={<MyIssuesPage />} />
        <Route path="/my-issues/subscribed" element={<MyIssuesPage />} />
        <Route path="/my-issues/activity" element={<MyIssuesPage />} />
        <Route path="/drafts" element={<TierTwoPage kind="drafts" />} />
        <Route path="/views" element={<ViewsPage />} />
        <Route path="/views/:viewId" element={<ViewDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/team/:teamKey/all" element={<TeamIssuesPage segment="all" />} />
        <Route path="/team/:teamKey/active" element={<TeamIssuesPage segment="active" />} />
        <Route path="/team/:teamKey/backlog" element={<TeamIssuesPage segment="backlog" />} />
        <Route path="/team/:teamKey/cycles" element={<CyclesPage />} />
        <Route path="/team/:teamKey/cycles/:cycleId" element={<CycleDetailPage />} />
        <Route path="/team/:teamKey/projects" element={<ProjectsPage teamScoped />} />
        <Route path="/team/:teamKey/views" element={<ViewsPage teamScoped />} />
        <Route path="/team/:teamKey/settings" element={<TeamSettingsPage />} />
        <Route path="/team/:teamKey/triage" element={<TeamIssuesPage segment="triage" />} />
        <Route path="/issue/:issueKey" element={<IssuePage />} />
        <Route path="/initiatives" element={<TierTwoPage kind="initiatives" />} />
        <Route path="/initiatives/:initiativeId" element={<TierTwoPage kind="initiative detail" />} />
        <Route path="/roadmap" element={<TierTwoPage kind="roadmap" />} />
        <Route path="/settings/account" element={<TierTwoPage kind="account settings" />} />
        <Route path="/settings/workspace" element={<TierTwoPage kind="workspace settings" />} />
        <Route path="/search" element={<GlobalSearchPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="*" element={<Navigate to="/my-issues" replace />} />
      </Routes>
    </LinearShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
