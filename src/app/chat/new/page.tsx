'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function NewChatRoom() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사용자가 로그인하지 않은 경우 처리
  if (!isLoading && !user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('채팅방 이름을 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // 채팅방 생성
      const docRef = await addDoc(collection(db, 'chatRooms'), {
        name: roomName,
        createdAt: serverTimestamp(),
        createdBy: user?.id,
        creatorNickname: user?.nickname,
      });
      
      // 성공적으로 생성된 경우 해당 채팅방으로 이동
      router.push(`/chat/${docRef.id}`);
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      setError('채팅방을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-6">
        <Link 
          href="/chat"
          className="text-instagram-blue hover:text-instagram-purple flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span>채팅방 목록으로 돌아가기</span>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">새 채팅방 만들기</h1>
          <div className="h-1 w-10 instagram-gradient rounded-full ml-3"></div>
        </div>
        
        <div className="h-1 w-full instagram-gradient rounded-full mb-6"></div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
              채팅방 이름
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue focus:border-transparent text-gray-800 bg-white"
              placeholder="채팅방 이름을 입력하세요"
              disabled={isSubmitting}
            />
            {error && <p className="mt-2 text-sm text-instagram-red">{error}</p>}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-instagram-blue hover:bg-instagram-purple cursor-pointer'
              } text-white px-4 py-2 rounded-md transition-colors`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  <span>생성 중...</span>
                </div>
              ) : '채팅방 생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 