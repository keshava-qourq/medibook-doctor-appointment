import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  apiFetch,
  clearSessionToken,
  clearStoredUser,
  getSessionToken,
  getStoredUser,
  setSessionToken,
  setStoredUser,
  setUnauthorizedHandler,
  type Role,
  type SessionUser,
} from "@/lib/api";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous"; user: null };

type AuthValue = AuthState & {
  signOut: () => Promise<void>;
  signIn: (token: string, user: SessionUser) => void;
};

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = React.useState<AuthState>(() =>
    getSessionToken() ? { status: "loading", user: null } : { status: "anonymous", user: null },
  );

  // Re-checked on every navigation, so a revoked or expired session cannot be
  // revealed by the browser's back button from cached state.
  React.useEffect(() => {
    if (!getSessionToken()) {
      clearStoredUser();
      setState({ status: "anonymous", user: null });
      return undefined;
    }
    let cancelled = false;
    const cached = getStoredUser();
    if (cached) setState({ status: "authenticated", user: cached });
    apiFetch<SessionUser>("/api/auth/me")
      .then((user) => {
        if (cancelled) return;
        setStoredUser(user);
        setState({ status: "authenticated", user });
      })
      .catch(() => {
        if (cancelled) return;
        clearSessionToken();
        clearStoredUser();
        setState({ status: "anonymous", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  React.useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: "anonymous", user: null }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value: AuthValue = React.useMemo(
    () => ({
      ...state,
      signIn: (token: string, user: SessionUser) => {
        setSessionToken(token);
        setStoredUser(user);
        setState({ status: "authenticated", user });
      },
      signOut: async () => {
        try {
          await apiFetch<void>("/api/auth/logout", { method: "POST" });
        } catch {
          // The session is ending locally either way.
        }
        clearSessionToken();
        clearStoredUser();
        setState({ status: "anonymous", user: null });
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/**
 * Client-side guard: renders nothing until the session is known, then either the
 * protected content or a redirect to sign-in. The server remains the authority.
 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") return null;
  if (status === "anonymous") return <Navigate to="/sign-in" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}
