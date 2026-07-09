"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@auth0/nextjs-auth0";

export interface AppUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Dev-only escape hatch: skip Auth0 entirely and act as a fixed local user.
// Must match DEV_USER_SUB in src/lib/api-auth.ts.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
const DEV_USER: AppUser = { sub: "dev-user", email: "dev@localhost", name: "Dev User" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading } = useUser();

  const user: AppUser | null = BYPASS_AUTH
    ? DEV_USER
    : auth0User
    ? {
        sub: auth0User.sub as string,
        email: auth0User.email as string,
        name: (auth0User.name ?? auth0User.email) as string,
        picture: auth0User.picture as string | undefined,
      }
    : null;

  return (
    <AuthContext.Provider value={{
      user,
      loading: BYPASS_AUTH ? false : isLoading,
      signOut: () => { window.location.href = "/auth/logout"; },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
