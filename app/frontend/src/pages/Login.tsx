import { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(username, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <div className="linear-login" data-testid="login-page">
      <div className="linear-login-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div className="workspace-mark">L</div>
          <div>
            <h1 className="page-title" style={{ fontSize: 18 }}>Linear Clone</h1>
            <p className="page-subtitle">Sign in to the workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="Enter username"
              required
              autoFocus
              data-testid="login-username"
            />
          </div>

          <div>
            <label className="label">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter password"
              required
              data-testid="login-password"
            />
          </div>

          {error && (
            <p style={{ color: "var(--danger)" }} data-testid="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", opacity: submitting ? 0.7 : 1 }}
            data-testid="login-submit"
          >
            <LogIn size={15} />
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="page-subtitle" style={{ textAlign: "center", marginTop: 18 }}>
          Default: admin / admin
        </p>
      </div>
    </div>
  );
}
