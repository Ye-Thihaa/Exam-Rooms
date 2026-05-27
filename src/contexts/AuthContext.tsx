import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import supabase from "@/utils/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatNameFromEmail(email: string): string {
  const prefix = email.split("@")[0];
  return prefix
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractUser(supabaseUser: SupabaseUser): User {
  const role = supabaseUser.app_metadata?.role ?? "";
  console.log("👤 extractUser:", {
    email: supabaseUser.email,
    role,
    app_metadata: supabaseUser.app_metadata,
    user_metadata: supabaseUser.user_metadata,
  });
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    role,
    name: supabaseUser.user_metadata?.name ?? formatNameFromEmail(supabaseUser.email ?? ""),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("❌ Session error:", error.message);
      console.log("📦 Initial session:", {
        exists: !!session,
        role: session?.user?.app_metadata?.role,
      });
      setUser(session?.user ? extractUser(session.user) : null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state change:", {
        event,
        role: session?.user?.app_metadata?.role,
        user: session?.user?.email,
      });
      setUser(session?.user ? extractUser(session.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      console.log("🔑 Login response:", {
        email: data?.user?.email,
        role: data?.user?.app_metadata?.role,
        app_metadata: data?.user?.app_metadata,
        error,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        setIsLoading(false);
        return { success: false, error: "No user returned from login" };
      }

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      console.log("🔁 Refresh response:", {
        role: refreshData?.user?.app_metadata?.role,
        error: refreshError,
      });

      setIsLoading(false);
      return { success: true };

    } catch (err: any) {
      console.error("💥 Login exception:", err);
      setIsLoading(false);
      return { success: false, error: err?.message ?? "Unexpected error during login" };
    }
  }, []);

 const logout = useCallback(async () => {
  console.log("🚪 Logging out");
  setUser(null);
  setIsLoading(false);        // ← set false so RootRedirect renders Landing
  await supabase.auth.signOut();
  // No window.location.href — let React Router handle it
}, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};