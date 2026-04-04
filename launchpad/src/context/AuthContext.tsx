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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading } = useUser();

  const user: AppUser | null = auth0User
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
      loading: isLoading,
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
