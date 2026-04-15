import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('notebuddy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }
    
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        localStorage.setItem('notebuddy_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('notebuddy_user');
        setCurrentUser(null);
      }
    } catch(err) {
      console.error('Auth error', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('notebuddy_user', JSON.stringify(user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('notebuddy_user');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, checkAuth, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
