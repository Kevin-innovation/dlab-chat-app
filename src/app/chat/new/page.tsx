'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function NewChatRoom() {
  const router = useRouter();
  const { user, isLoading, checkAdminPassword } = useUser();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [isLoading, user, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAdminPasswordError('');

    if (!roomName.trim()) {
      setErrorMsg('채팅방 이름을 입력해주세요.');
      return;
    }

    if (!checkAdminPassword(adminPassword)) {
      setAdminPasswordError('올바른 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await addDoc(collection(db, 'chatRooms'), {
        name: roomName,
        password: password || null,
        createdAt: new Date(),
        createdBy: user.id,
      });
      router.push('/chat');
    } catch (error) {
      console.error('Error creating chat room:', error);
      setErrorMsg('채팅방 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center mb-6">
          <img src="/kevin.png" alt="Kevin" className="w-8 h-8 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">새 채팅방 생성</h1>
          <div className="h-1 w-16 instagram-gradient rounded-full ml-3"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
              채팅방 이름
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
              placeholder="채팅방 이름 입력"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 (선택)
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
              placeholder="비밀번호 입력 (선택)"
            />
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
              관리자 비밀번호
            </label>
            <input
              type="password"
              id="adminPassword"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
              placeholder="관리자 비밀번호 입력 (필수)"
            />
            {adminPasswordError && <p className="text-red-500 text-sm mt-1">{adminPasswordError}</p>}
          </div>
          
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          
          <div className="flex justify-between gap-4 pt-2">
            <Link
              href="/chat"
              className="w-full py-2 px-4 border border-instagram-purple text-instagram-darkpurple rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-instagram-blue text-center"
            >
              취소
            </Link>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple focus:outline-none focus:ring-2 focus:ring-instagram-blue"
            >
              생성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 