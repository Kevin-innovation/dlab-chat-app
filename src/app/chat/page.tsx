'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { collection, query, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface ChatRoom {
  id: string;
  name: string;
  createdAt: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export default function ChatList() {
  const router = useRouter();
  const { user, isLoading, isAdmin, checkAdminPassword } = useUser();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

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

  const handleAdminLogin = () => {
    const isCorrect = checkAdminPassword(adminPassword);
    if (isCorrect) {
      setShowAdminModal(false);
      setAdminPassword('');
      setAdminError('');
    } else {
      setAdminError('잘못된 비밀번호입니다.');
    }
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
    <div className="max-w-3xl mx-auto p-4 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800">채팅방 목록</h1>
          <div className="h-1 w-10 instagram-gradient rounded-full ml-2"></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{user.nickname}님</span>
          <button 
            onClick={() => setShowAdminModal(true)}
            className="bg-instagram-purple text-white px-4 py-2 rounded-md hover:bg-instagram-darkpurple transition-colors w-24 text-center"
          >
            관리자
          </button>
          <Link 
            href="/chat/new"
            className="bg-instagram-blue text-white px-4 py-2 rounded-md hover:bg-instagram-purple transition-colors w-24 text-center"
          >
            새 채팅방
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
            className="bg-instagram-blue text-white px-4 py-2 rounded-md hover:bg-instagram-purple transition-colors w-24 text-center inline-block"
          >
            첫 채팅방 만들기
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

      {/* 관리자 모드 패스워드 입력 모달 */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">관리자 로그인</h3>
              <div className="h-1 w-16 instagram-gradient rounded-full ml-3"></div>
            </div>
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
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminPassword('');
                  setAdminError('');
                }}
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
        </div>
      )}
    </div>
  );
} 