'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
  nickname: string;
  isAdmin?: boolean;
  createdAt?: Date;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading, isAdmin, getUsers, deleteUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // 사용자가 로그인하지 않았거나 관리자가 아닌 경우 리다이렉트
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/chat');
    }
  }, [user, isLoading, isAdmin, router]);

  // 사용자 목록 불러오기
  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        try {
          const userList = await getUsers();
          setUsers(userList);
        } catch (error) {
          console.error('사용자 목록 불러오기 실패:', error);
          setError('사용자 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, getUsers, user]);

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return;
    
    try {
      setDeleteLoading(userId);
      const success = await deleteUser(userId);
      
      if (success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        setError('사용자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      setError('사용자 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '알 수 없음';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-instagram-blue rounded-full border-t-transparent animate-spin mb-4"></div>
          <div className="text-instagram-blue font-medium">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-6">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link 
            href="/chat"
            className="bg-instagram-blue text-white px-4 py-2 rounded-md hover:bg-instagram-purple transition-colors"
          >
            채팅방으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto p-4 bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Image src="/kevin.png" width={32} height={32} alt="Kevin" className="mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">관리자 페이지</h1>
            <div className="h-1 w-10 instagram-gradient rounded-full ml-2"></div>
          </div>
          <Link
            href="/chat"
            className="bg-instagram-blue text-white px-3 py-2 rounded-md hover:bg-instagram-purple transition-colors min-w-[100px] text-center"
          >
            채팅방 목록
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">사용자 관리</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-instagram-blue rounded-full border-t-transparent animate-spin mb-2"></div>
                <div className="text-instagram-blue text-sm">사용자 목록 불러오는 중...</div>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">등록된 사용자가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-4 border-b text-left">닉네임</th>
                    <th className="py-2 px-4 border-b text-left">사용자 ID</th>
                    <th className="py-2 px-4 border-b text-left">생성일</th>
                    <th className="py-2 px-4 border-b text-left">관리자</th>
                    <th className="py-2 px-4 border-b text-right">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{userItem.nickname}</td>
                      <td className="py-2 px-4 border-b text-xs text-gray-500">{userItem.id}</td>
                      <td className="py-2 px-4 border-b text-sm">{formatDate(userItem.createdAt)}</td>
                      <td className="py-2 px-4 border-b">
                        {userItem.isAdmin ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">관리자</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">일반</span>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          disabled={deleteLoading === userItem.id || userItem.isAdmin}
                          className={`text-white p-2 rounded-md ${
                            userItem.isAdmin 
                              ? 'bg-gray-300 cursor-not-allowed' 
                              : 'bg-instagram-red hover:bg-instagram-darkpink'
                          }`}
                          title={userItem.isAdmin ? "관리자는 삭제할 수 없습니다" : "사용자 삭제"}
                        >
                          {deleteLoading === userItem.id ? (
                            <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 