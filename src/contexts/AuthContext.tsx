import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserSession, userManagementApi } from "@/lib/api";
import { UserPermission, buildAllowedRoutes } from "@/lib/permissions";

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: UserPermission[];
  allowedRoutes: Set<string>;
  login: (user: UserSession) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "fpda_user_session";
const PERMS_KEY = "fpda_user_permissions";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [allowedRoutes, setAllowedRoutes] = useState<Set<string>>(new Set(["/dashboard"]));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    const storedPerms = localStorage.getItem(PERMS_KEY);
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        setUser(parsedSession);
        const parsedPerms: UserPermission[] = storedPerms ? JSON.parse(storedPerms) : [];
        setPermissions(parsedPerms);
        setAllowedRoutes(buildAllowedRoutes(parsedPerms));
      } catch (error) {
        console.error("Failed to parse stored session:", error);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PERMS_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));

    // Fetch permissions right after login
    try {
      const res = await userManagementApi.getPermissions({ user_code: userData.user_code });
      const perms: UserPermission[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPermissions(perms);
      setAllowedRoutes(buildAllowedRoutes(perms));
      localStorage.setItem(PERMS_KEY, JSON.stringify(perms));
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      setPermissions([]);
      setAllowedRoutes(new Set(["/dashboard"]));
    }
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    setAllowedRoutes(new Set(["/dashboard"]));
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PERMS_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        permissions,
        allowedRoutes,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
