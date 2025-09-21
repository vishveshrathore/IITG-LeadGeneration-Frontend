import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState({
    authToken: null,
    role: null,
    user: null, // { id, name, email, reportsTo }
  });

  // --- Load from storage on first render ---
  useEffect(() => {
    try {
      const storedToken =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const storedRole =
        localStorage.getItem("role") || sessionStorage.getItem("role");
      const storedUser =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      if (storedToken && storedRole && storedUser) {
        setAuthData({
          authToken: storedToken,
          role: storedRole,
          user: {
            ...storedUser,
            name: storedUser.name?.replace(/ LG$/, "") || "Unknown User",
            email: storedUser.email || "",
          },
        });
      }
    } catch (error) {
      console.error("Failed to parse stored user data:", error);
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  // --- Login: save sanitized data to storage ---
  const login = (token, role, user, remember) => {
    const cleanUser = {
      id: user.id,
      name: user.name?.replace(/ LG$/, "") || "Unknown User",
      email: user.email || "",
      reportsTo: user.reportsTo || null,
    };

    const userString = JSON.stringify(cleanUser);

    if (remember) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", userString);
    } else {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("user", userString);
    }

    setAuthData({ authToken: token, role, user: cleanUser });
  };

  // --- Logout: clear everything ---
  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setAuthData({ authToken: null, role: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ ...authData, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
