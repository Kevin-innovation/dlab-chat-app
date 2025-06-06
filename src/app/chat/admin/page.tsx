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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [adminDeletePw, setAdminDeletePw] = useState('');
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [adminDeleteError, setAdminDeleteError] = useState('');

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

  const handleEditNickname = async (userId: string) => {
    if (!editNickname.trim()) {
      setNicknameError('닉네임을 입력하세요.');
      return;
    }
    setNicknameLoading(true);
    setNicknameError('');
    try {
      // Firestore 업데이트
      const res = await fetch(`/api/admin/update-nickname`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname: editNickname.trim() })
      });
      if (!res.ok) throw new Error('닉네임 변경 실패');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, nickname: editNickname.trim() } : u));
      setEditingUserId(null);
      setEditNickname('');
    } catch (e) {
      setNicknameError('닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setNicknameLoading(false);
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

  const checkAdminPassword = async (pw: string) => {
    const res = await fetch('/api/admin/check-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    return data.ok;
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
            className="bg-instagram-blue text-white px-3 py-2 rounded-md hover:bg-instagram-purple transition-colors min-w-[100px] text-center flex items-center justify-center"
          >
            <span>채팅방</span>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-md">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-600">닉네임</th>
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-600">사용자 ID</th>
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-600">생성일</th>
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-600">관리자</th>
                    <th className="py-2 px-3 border-b text-right text-xs font-medium text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b text-sm">
                        {editingUserId === userItem.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editNickname}
                              onChange={e => setEditNickname(e.target.value)}
                              className="border px-2 py-1 rounded text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditNickname(userItem.id)}
                              disabled={nicknameLoading}
                              className="bg-instagram-blue text-white px-2 py-1 rounded text-xs hover:bg-instagram-purple"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => { setEditingUserId(null); setEditNickname(''); setNicknameError(''); }}
                              className="text-gray-400 px-2 py-1 text-xs"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <span>{userItem.nickname}</span>
                            <button
                              onClick={() => { setEditingUserId(userItem.id); setEditNickname(userItem.nickname); setNicknameError(''); }}
                              className="text-instagram-blue hover:text-instagram-purple"
                              title="닉네임 수정"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {editingUserId === userItem.id && nicknameError && (
                          <div className="text-xs text-instagram-red mt-1">{nicknameError}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 border-b text-xs text-gray-500 truncate max-w-[120px]">{userItem.id}</td>
                      <td className="py-2 px-3 border-b text-xs">{formatDate(userItem.createdAt)}</td>
                      <td className="py-2 px-3 border-b">
                        {userItem.isAdmin ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">관리자</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">일반</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-b text-right">
                        <button
                          onClick={() => {
                            if (userItem.isAdmin) {
                              setPendingDeleteUserId(userItem.id);
                              setShowAdminDeleteModal(true);
                            } else {
                              handleDeleteUser(userItem.id);
                            }
                          }}
                          disabled={deleteLoading === userItem.id}
                          className={`text-white p-1.5 rounded-md ${deleteLoading === userItem.id ? 'bg-gray-300' : 'bg-instagram-red hover:bg-instagram-darkpink'}`}
                          title={userItem.isAdmin ? "관리자 삭제" : "사용자 삭제"}
                        >
                          {deleteLoading === userItem.id ? (
                            <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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

      {showAdminDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">관리자 삭제 확인</h3>
            <p className="mb-2 text-sm text-gray-700">관리자를 삭제하려면 관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={adminDeletePw}
              onChange={e => setAdminDeletePw(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
              placeholder="관리자 비밀번호"
            />
            {adminDeleteError && <p className="text-instagram-red text-sm mt-1">{adminDeleteError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAdminDeleteModal(false);
                  setAdminDeletePw('');
                  setPendingDeleteUserId(null);
                  setAdminDeleteError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const ok = await checkAdminPassword(adminDeletePw);
                  if (ok) {
                    handleDeleteUser(pendingDeleteUserId!);
                    setShowAdminDeleteModal(false);
                    setAdminDeletePw('');
                    setPendingDeleteUserId(null);
                    setAdminDeleteError('');
                  } else {
                    setAdminDeleteError('비밀번호가 올바르지 않습니다.');
                  }
                }}
                className="px-4 py-2 bg-instagram-red text-white rounded-md hover:bg-instagram-darkpink"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 