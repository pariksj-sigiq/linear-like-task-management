import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(username, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <div className="grid min-h-svh place-items-center bg-background p-6" data-testid="login-page">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-row items-center gap-3">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">C</div>
          <div>
            <CardTitle>Collinear</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to the workspace</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Label className="grid gap-1.5">
              <span>Username</span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                data-testid="login-username"
              />
            </Label>

            <Label className="grid gap-1.5">
              <span>Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                data-testid="login-password"
              />
            </Label>

            {error && (
              <p className="text-sm text-destructive" data-testid="login-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              data-testid="login-submit"
            >
              <LogIn size={15} />
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">Default: admin / admin</p>
        </CardContent>
      </Card>
    </div>
  );
}
