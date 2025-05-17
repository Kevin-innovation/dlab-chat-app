import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserFromStorage, saveUserToStorage, removeUserFromStorage, generateUserId } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';

interface User {
  id: string;
  nickname: string;
  isAdmin?: boolean;
  createdAt?: Date;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (nickname: string) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  checkAdminPassword: (password: string) => boolean;
  getUsers: () => Promise<User[]>;
  deleteUser: (userId: string) => Promise<boolean>;
  updateNickname: (newNickname: string) => Promise<boolean>;
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

  const login = async (nickname: string) => {
    const userId = generateUserId();
    const newUser = {
      id: userId,
      nickname
    };
    
    try {
      // Firebase에 사용자 정보 저장
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        createdAt: serverTimestamp()
      });
      
      setUser(newUser);
      saveUserToStorage(newUser);
    } catch (error) {
      console.error('사용자 정보 저장 실패:', error);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    removeUserFromStorage();
  };

  const checkAdminPassword = (password: string) => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    const isCorrectPassword = password === adminPassword;
    
    if (isCorrectPassword && user) {
      const adminUser = { ...user, isAdmin: true };
      setUser(adminUser);
      setIsAdmin(true);
      saveUserToStorage(adminUser);
    }
    
    return isCorrectPassword;
  };
  
  // 모든 사용자 목록 가져오기 (관리자 전용)
  const getUsers = async (): Promise<User[]> => {
    if (!isAdmin) {
      return [];
    }
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          nickname: data.nickname,
          isAdmin: data.isAdmin || false,
          createdAt: data.createdAt?.toDate()
        });
      });
      
      return users;
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      return [];
    }
  };
  
  // 사용자 삭제 (관리자 전용)
  const deleteUser = async (userId: string): Promise<boolean> => {
    if (!isAdmin) {
      return false;
    }
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      return false;
    }
  };

  // 닉네임 변경 함수
  const updateNickname = async (newNickname: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Firebase의 사용자 문서 업데이트
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        nickname: newNickname,
        isAdmin: user.isAdmin || false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // 상태 업데이트
      const updatedUser = {
        ...user,
        nickname: newNickname
      };
      setUser(updatedUser);
      saveUserToStorage(updatedUser);
      
      return true;
    } catch (error) {
      console.error('닉네임 변경 실패:', error);
      return false;
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      login, 
      logout, 
      isLoading, 
      isAdmin, 
      checkAdminPassword,
      getUsers,
      deleteUser,
      updateNickname
    }}>
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