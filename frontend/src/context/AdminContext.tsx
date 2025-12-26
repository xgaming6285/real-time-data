"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminContextType {
  admin: Admin | null;
  loading: boolean;
  login: (adminData: Admin) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
      } else {
        setAdmin(null);
        // Don't log 401 errors - they're expected when not authenticated
      }
    } catch (error) {
      // Only log unexpected errors (network issues, etc.)
      console.error("Admin auth check failed", error);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip auth check on the login page to avoid unnecessary 401 errors
    const isLoginPage =
      pathname === "/admin-panel" || pathname === "/admin-panel/";

    if (isLoginPage) {
      setLoading(false);
      return;
    }

    checkAuth();
  }, [checkAuth, pathname]);

  const login = (adminData: Admin) => {
    setAdmin(adminData);
    router.push("/admin-panel/dashboard");
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAdmin(null);
      router.push("/admin-panel");
    } catch (error) {
      console.error("Admin logout failed", error);
    }
  };

  return (
    <AdminContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
