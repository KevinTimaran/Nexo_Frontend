import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../domain/types";
import { services } from "../services";
import { getSupabase, isSupabaseConfigured, toUser } from "../services/supabase";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while the saved session is restored at startup. */
  isHydrating: boolean;
  signIn: (email: string, pass: string) => Promise<User>;
  signUp: (name: string, email: string, pass: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "nexo.auth.user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabaseOn = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(() => {
    // With real accounts the Supabase session is the source of truth, not localStorage.
    if (supabaseOn) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  // True only while the saved session is being restored at startup (never during sign-in).
  const [isHydrating, setIsHydrating] = useState(supabaseOn);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session ? toUser(data.session.user) : null);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsHydrating(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session ? toUser(session.user) : null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // The API answered 401 for a signed-in user: the session is no longer valid.
  useEffect(() => {
    const onExpired = () => {
      void getSupabase()?.auth.signOut().catch(() => undefined);
      setUser(null);
    };
    window.addEventListener("nexo:session-expired", onExpired);
    return () => window.removeEventListener("nexo:session-expired", onExpired);
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await services.auth.signIn(email, pass);
      setUser(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const result = await services.auth.signUp(name, email, pass);
      setUser(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await services.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isHydrating,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
