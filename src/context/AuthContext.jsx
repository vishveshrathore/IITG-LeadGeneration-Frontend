import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const storedRole = localStorage.getItem('role') || sessionStorage.getItem('role');

    if (storedToken && storedRole) {
      setAuthToken(storedToken);
      setRole(storedRole);
    }
  }, []);

  const login = (token, role, remember) => {
    if (remember) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
    } else {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', role);
    }

    setAuthToken(token);
    setRole(role);
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setAuthToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Always define the hook separately
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
