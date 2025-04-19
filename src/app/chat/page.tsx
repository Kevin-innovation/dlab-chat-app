'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { collection, query, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';

interface ChatRoom {
  id: string;
  name: string;
  createdAt: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
}

interface User {
  id: string;
  nickname: string;
  isAdmin?: boolean;
  createdAt?: Date;
}

export default function ChatList() {
  const router = useRouter();
  const { user, isLoading, isAdmin, checkAdminPassword, getUsers, deleteUser: deleteUserById } = useUser();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<'login' | 'users'>('login');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');

  // 사용자가 로그인하지 않은 경우 홈으로 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 채팅방 목록 불러오기
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const chatRoomsRef = collection(db, 'chatRooms');
        const q = query(chatRoomsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const rooms: ChatRoom[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          rooms.push({
            id: doc.id,
            name: data.name,
            createdAt: data.createdAt.toDate(),
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toDate() : undefined,
          });
        });
        
        setChatRooms(rooms);
      } catch (error) {
        console.error('채팅방 목록을 불러오는 데 실패했습니다:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChatRooms();
    }
  }, [user]);

  const handleAdminLogin = async () => {
    const isCorrect = checkAdminPassword(adminPassword);
    
    if (isCorrect) {
      setAdminError('');
      setAdminMode('users');
      
      try {
        setLoadingUsers(true);
        const fetchedUsers = await getUsers();
        setUsersList(fetchedUsers);
      } catch (error) {
        console.error('사용자 목록 불러오기 실패:', error);
        setUserError('사용자 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoadingUsers(false);
      }
    } else {
      setAdminError('잘못된 비밀번호입니다.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return;
    
    try {
      setDeleteLoading(userId);
      const success = await deleteUserById(userId);
      
      if (success) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
      } else {
        setUserError('사용자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      setUserError('사용자 삭제 중 오류가 발생했습니다.');
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

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPassword('');
    setAdminError('');
    setUserError('');
    setAdminMode('login');
  };

  const handleDeleteChatRoom = async (roomId: string) => {
    if (!isAdmin) return;
    
    try {
      setDeleteLoading(roomId);
      const chatRoomRef = doc(db, 'chatRooms', roomId);
      await deleteDoc(chatRoomRef);
      
      // 목록에서 삭제된 채팅방 제거
      setChatRooms(prev => prev.filter(room => room.id !== roomId));
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      alert('채팅방을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(null);
    }
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

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto p-4 bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Image src="/kevin.png" width={32} height={32} alt="Kevin" className="mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">채팅방 목록</h1>
            <div className="h-1 w-10 instagram-gradient rounded-full ml-2"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">{user.nickname}님</span>
            {isAdmin && (
              <Link
                href="/chat/admin"
                className="bg-instagram-purple text-white px-3 py-2 rounded-md hover:bg-instagram-darkpurple transition-colors text-center min-w-[100px] flex items-center justify-center"
              >
                <span>관리자</span>
              </Link>
            )}
            {!isAdmin && (
              <button 
                onClick={() => setShowAdminModal(true)}
                className="bg-instagram-purple text-white px-3 py-2 rounded-md hover:bg-instagram-darkpurple transition-colors text-center min-w-[100px] flex items-center justify-center"
              >
                <span>관리자</span>
              </button>
            )}
            <Link 
              href="/chat/new"
              className="bg-instagram-blue text-white px-3 py-2 rounded-md hover:bg-instagram-purple transition-colors text-center min-w-[100px] flex items-center justify-center"
            >
              <span>새 채팅방</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-instagram-blue rounded-full border-t-transparent animate-spin mb-2"></div>
              <div className="text-instagram-blue text-sm">채팅방 불러오는 중...</div>
            </div>
          </div>
        ) : chatRooms.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">채팅방이 없습니다</p>
            <Link 
              href="/chat/new"
              className="bg-instagram-blue text-white px-3 py-2 rounded-md hover:bg-instagram-purple transition-colors min-w-[100px] text-center inline-block"
            >
              첫 채팅방
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <div key={room.id} className="flex items-center">
                <Link 
                  href={`/chat/${room.id}`}
                  className="flex-1"
                >
                  <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
                    <div className="flex justify-between">
                      <h2 className="font-medium text-gray-800">{room.name}</h2>
                      <span className="text-sm text-gray-500">
                        {room.lastMessageTime ? new Date(room.lastMessageTime).toLocaleDateString() : new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {room.lastMessage && (
                      <p className="text-gray-600 text-sm mt-1 truncate">{room.lastMessage}</p>
                    )}
                  </div>
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteChatRoom(room.id)}
                    disabled={deleteLoading === room.id}
                    className="ml-2 bg-instagram-red text-white p-2 rounded-md hover:bg-instagram-darkpink transition-colors"
                    title="채팅방 삭제"
                  >
                    {deleteLoading === room.id ? (
                      <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 관리자 모드 패스워드 입력 및 사용자 관리 모달 */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {adminMode === 'login' ? '관리자 로그인' : '사용자 관리'}
                </h3>
                <div className="h-1 w-16 instagram-gradient rounded-full ml-3"></div>
              </div>

              {adminMode === 'login' ? (
                <div>
                  <div className="mb-4">
                    <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호
                    </label>
                    <input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue focus:border-transparent text-gray-800"
                      placeholder="관리자 비밀번호 입력"
                    />
                    {adminError && <p className="mt-2 text-sm text-instagram-red">{adminError}</p>}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={closeAdminModal}
                      className="px-4 py-2 text-instagram-darkpurple border border-instagram-purple rounded-md hover:bg-gray-50 transition-colors w-24 text-center"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAdminLogin}
                      className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple transition-colors w-24 text-center"
                    >
                      확인
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {userError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4">
                      {userError}
                    </div>
                  )}

                  {loadingUsers ? (
                    <div className="flex justify-center py-10">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-instagram-blue rounded-full border-t-transparent animate-spin mb-2"></div>
                        <div className="text-instagram-blue text-sm">사용자 목록 불러오는 중...</div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto mb-4">
                      <table className="min-w-full bg-white border border-gray-200 rounded-md">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="py-2 px-3 border-b text-left">닉네임</th>
                            <th className="py-2 px-3 border-b text-left">관리자</th>
                            <th className="py-2 px-3 border-b text-right">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((userItem) => (
                            <tr key={userItem.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 border-b">
                                <div>
                                  {userItem.nickname}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(userItem.createdAt)}
                                </div>
                              </td>
                              <td className="py-2 px-3 border-b">
                                {userItem.isAdmin ? (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">관리자</span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">일반</span>
                                )}
                              </td>
                              <td className="py-2 px-3 border-b text-right">
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
                  
                  <div className="flex justify-end">
                    <button
                      onClick={closeAdminModal}
                      className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 