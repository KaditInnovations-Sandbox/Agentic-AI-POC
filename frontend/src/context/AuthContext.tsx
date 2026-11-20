"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchDemoUsers, fetchProfile } from "@/lib/api";
import { UserProfileResponse } from "@/lib/types";

interface AuthContextType {
  user: UserProfileResponse | null;
  demoUsers: UserProfileResponse[];
  loading: boolean;
  switchUser: (u: UserProfileResponse) => void;
  loginWithEmail: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  demoUsers: [],
  loading: true,
  switchUser: () => {},
  loginWithEmail: async () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [demoUsers, setDemoUsers] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const users = await fetchDemoUsers();
        setDemoUsers(users);

        const savedUserId = localStorage.getItem("active_user_id");
        if (savedUserId) {
          const matched = users.find((u) => u.id === Number(savedUserId));
          if (matched) {
            setUser(matched);
            setLoading(false);
            return;
          }
        }

        // Default to Asha Kumar (ID 1)
        if (users.length > 0) {
          const defaultUser = users[0];
          setUser(defaultUser);
          localStorage.setItem("active_user_id", String(defaultUser.id));
        }
      } catch (err) {
        console.warn("Failed to load demo users:", err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const switchUser = (u: UserProfileResponse) => {
    setUser(u);
    localStorage.setItem("active_user_id", String(u.id));
  };

  const loginWithEmail = async (email: string): Promise<boolean> => {
    const matched = demoUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      switchUser(matched);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (demoUsers.length > 0) {
      switchUser(demoUsers[0]);
    } else {
      setUser(null);
      localStorage.removeItem("active_user_id");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        demoUsers,
        loading,
        switchUser,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
