import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, logout } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ALLOWED_EMAIL = "thithutrangn28@gmail.com";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (currentUser.email === ALLOWED_EMAIL) {
          setUser(currentUser);
          setError(null);
        } else {
          // If not allowed email, sign out immediately
          logout();
          setUser(null);
          setError("Tài khoản này không có quyền truy cập. Vui lòng đăng nhập bằng đúng tài khoản quy định.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
