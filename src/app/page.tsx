'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export default function Home() {
  const router = useRouter();
  const { user, login } = useUser();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이미 로그인된 경우 채팅 페이지로 리다이렉트
  if (user) {
    router.push('/chat');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    login(nickname);
    router.push('/chat');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="instagram-gradient h-12 w-12 rounded-full mx-auto mb-4"></div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">실시간 채팅</h1>
          <p className="text-gray-600">닉네임을 입력하고 채팅에 참여하세요</p>
          <p className="text-instagram-red font-medium mt-2">학생 본인 이름을 꼭 입력해 주세요</p>
        </div>
        
        <div className="h-1 w-full instagram-gradient rounded-full"></div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              닉네임
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue focus:border-transparent text-gray-800 bg-white"
            />
            {error && <p className="mt-2 text-sm text-instagram-red">{error}</p>}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white transition-colors ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-instagram-blue hover:bg-instagram-purple cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  <span>처리 중...</span>
                </div>
              ) : '채팅 참여하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 