'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderNickname: string;
  timestamp: Date;
}

interface ChatRoomData {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  creatorNickname: string;
}

export default function ChatRoom({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useUser();
  const [chatRoom, setChatRoom] = useState<ChatRoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 사용자가 로그인하지 않은 경우 홈으로 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 채팅방 정보 불러오기
  useEffect(() => {
    const fetchChatRoom = async () => {
      try {
        const docRef = doc(db, 'chatRooms', params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatRoom({
            id: docSnap.id,
            name: data.name,
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            creatorNickname: data.creatorNickname
          });
        } else {
          setError('채팅방을 찾을 수 없습니다.');
          router.push('/chat');
        }
      } catch (error) {
        console.error('채팅방 정보를 불러오는 데 실패했습니다:', error);
        setError('채팅방 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChatRoom();
    }
  }, [params.id, user, router]);

  // 메시지 불러오기 및 실시간 수신
  useEffect(() => {
    if (!user || !params.id) return;

    const messagesRef = collection(db, 'chatRooms', params.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          senderNickname: data.senderNickname,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      setMessages(fetchedMessages);
    }, (error) => {
      console.error('메시지를 불러오는 중 오류가 발생했습니다:', error);
    });
    
    return () => unsubscribe();
  }, [params.id, user]);

  // 메시지 전송 후 스크롤 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    try {
      const messagesRef = collection(db, 'chatRooms', params.id, 'messages');
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.id,
        senderNickname: user.nickname,
        timestamp: serverTimestamp()
      });

      // 채팅방의 마지막 메시지 업데이트
      const chatRoomRef = doc(db, 'chatRooms', params.id);
      await getDoc(chatRoomRef);
      
      setNewMessage('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setError('메시지 전송 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isAdmin) return;
    
    try {
      setDeletingMessage(messageId);
      const messageRef = doc(db, 'chatRooms', params.id, 'messages', messageId);
      await deleteDoc(messageRef);
      // onSnapshot이 자동으로 목록을 업데이트하므로 별도의 상태 업데이트는 필요 없음
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지를 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setDeletingMessage(null);
    }
  };

  if (isLoading || loading || !user) {
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
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="bg-white shadow p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link 
              href="/chat"
              className="text-instagram-blue hover:text-instagram-purple"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Image src="/kevin.png" width={28} height={28} alt="Kevin" className="mr-2" />
            <h1 className="text-xl font-bold text-gray-800">{chatRoom?.name}</h1>
            {isAdmin && (
              <span className="text-xs text-white bg-instagram-red px-2 py-1 rounded-full">관리자</span>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            <span>{chatRoom?.creatorNickname}님이 생성</span>
            <div className="h-1 w-6 instagram-gradient rounded-full ml-2"></div>
          </div>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="instagram-gradient h-10 w-10 rounded-full mx-auto mb-4 opacity-20"></div>
              <p className="text-gray-500">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
              >
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    disabled={deletingMessage === message.id}
                    className="text-instagram-red hover:text-instagram-darkpink mr-1 self-center"
                    title="메시지 삭제"
                  >
                    {deletingMessage === message.id ? (
                      <div className="w-4 h-4 border-2 border-instagram-red rounded-full border-t-transparent animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
                <div
                  className={`max-w-xs sm:max-w-md rounded-lg px-4 py-2 ${
                    message.senderId === user.id
                      ? 'bg-instagram-blue text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
                  }`}
                >
                  {message.senderId !== user.id && (
                    <div className="font-medium text-sm text-gray-700 mb-1">
                      {message.senderNickname}
                    </div>
                  )}
                  <p>{message.text}</p>
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatDate(message.timestamp)}
                  </div>
                </div>
                {isAdmin && message.senderId === user.id && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    disabled={deletingMessage === message.id}
                    className="text-instagram-red hover:text-instagram-darkpink ml-1 self-center"
                    title="메시지 삭제"
                  >
                    {deletingMessage === message.id ? (
                      <div className="w-4 h-4 border-2 border-instagram-red rounded-full border-t-transparent animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 메시지 입력 영역 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue focus:border-transparent text-gray-800 bg-white"
            />
            <button
              type="submit"
              className="bg-instagram-blue text-white px-4 py-2 rounded-md hover:bg-instagram-purple transition-colors"
              disabled={!newMessage.trim()}
            >
              전송
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-instagram-red">{error}</p>}
        </div>
      </div>
    </div>
  );
} 