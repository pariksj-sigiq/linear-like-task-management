import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else if (import.meta.env.DEV) {
          setUser({
            id: "dev-admin",
            username: "admin",
            full_name: "System Administrator",
            email: null,
            role: "admin",
            avatar_url: null,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          setUser({
            id: "dev-admin",
            username: "admin",
            full_name: "System Administrator",
            email: null,
            role: "admin",
            avatar_url: null,
          });
        }
        setLoading(false);
      });
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    setUser(data.user);
    return null;
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
