import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserFromStorage, saveUserToStorage, removeUserFromStorage, generateUserId } from '@/lib/utils';

interface User {
  id: string;
  nickname: string;
  isAdmin?: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (nickname: string) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  checkAdminPassword: (password: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 시 로컬 스토리지에서 사용자 정보 로드
    const userFromStorage = getUserFromStorage();
    if (userFromStorage) {
      setUser(userFromStorage);
      setIsAdmin(userFromStorage.isAdmin || false);
    }
    setIsLoading(false);
  }, []);

  const login = (nickname: string) => {
    const newUser = {
      id: generateUserId(),
      nickname
    };
    setUser(newUser);
    saveUserToStorage(newUser);
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    removeUserFromStorage();
  };

  const checkAdminPassword = (password: string) => {
    const isCorrectPassword = password === '4490';
    
    if (isCorrectPassword && user) {
      const adminUser = { ...user, isAdmin: true };
      setUser(adminUser);
      setIsAdmin(true);
      saveUserToStorage(adminUser);
    }
    
    return isCorrectPassword;
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, isLoading, isAdmin, checkAdminPassword }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 