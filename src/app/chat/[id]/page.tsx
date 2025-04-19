'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderNickname: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatRoomData {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  creatorNickname: string;
  password?: string;
  pinnedNotice?: {
    content: string;
  };
  participants?: {
    [userId: string]: {
      id: string;
      nickname: string;
      joinedAt: Date;
      isAdmin?: boolean;
    }
  }
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
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeContent, setNoticeContent] = useState('');
  const [savingNotice, setSavingNotice] = useState(false);
  
  // 채팅방 관리 관련 상태
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'participants' | 'settings'>('participants');
  const [roomNameEdit, setRoomNameEdit] = useState('');
  const [roomPasswordEdit, setRoomPasswordEdit] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState('');
  
  // 비밀번호 확인 관련 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 참여자 목록 모달 관련 상태
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

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
          const roomData = {
            id: docSnap.id,
            name: data.name,
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            creatorNickname: data.creatorNickname,
            password: data.password || undefined,
            pinnedNotice: data.pinnedNotice,
            participants: data.participants || {}
          };
          
          setChatRoom(roomData);
          
          console.log('채팅방 데이터:', roomData); // 데이터 확인용 로그
          
          // 비밀번호가 있는 방인 경우 비밀번호 확인 필요
          if (data.password && !isAdmin) {
            setShowPasswordModal(true);
          } else {
            setIsAuthorized(true);
            // 채팅방에 현재 사용자가 참여자로 등록되어 있지 않으면 추가
            if (user && (!data.participants || !data.participants[user.id])) {
              await updateDoc(docRef, {
                [`participants.${user.id}`]: {
                  id: user.id,
                  nickname: user.nickname,
                  joinedAt: serverTimestamp(),
                  isAdmin: user.isAdmin || false
                }
              });
            }
          }
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
  }, [params.id, user, router, isAdmin]);

  // 비밀번호 확인 처리
  const handleCheckPassword = async () => {
    if (!chatRoom) return;
    
    if (roomPassword === chatRoom.password) {
      setIsAuthorized(true);
      setShowPasswordModal(false);
      setPasswordError('');
      
      // 참여자 목록에 추가
      if (user) {
        const chatRoomRef = doc(db, 'chatRooms', params.id);
        await updateDoc(chatRoomRef, {
          [`participants.${user.id}`]: {
            id: user.id,
            nickname: user.nickname,
            joinedAt: serverTimestamp(),
            isAdmin: user.isAdmin || false
          }
        });
      }
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  // 메시지 불러오기 및 실시간 수신 - 인증된 사용자만
  useEffect(() => {
    if (!user || !params.id || !isAuthorized) return;

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
          timestamp: data.timestamp?.toDate() || new Date(),
          isSystem: data.isSystem || false
        });
      });
      
      setMessages(fetchedMessages);
    }, (error) => {
      console.error('메시지를 불러오는 중 오류가 발생했습니다:', error);
    });
    
    return () => unsubscribe();
  }, [params.id, user, isAuthorized]);

  // 참여자 검증 함수
  const isParticipant = () => {
    if (!chatRoom || !user) return false;
    return chatRoom.participants && chatRoom.participants[user.id] !== undefined;
  };

  // 실시간으로 참여자 상태 확인
  useEffect(() => {
    if (!user || !params.id || !isAuthorized) return;

    // 채팅방 문서의 실시간 변경 감지
    const chatRoomRef = doc(db, 'chatRooms', params.id);
    const unsubscribe = onSnapshot(chatRoomRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const updatedChatRoom = {
          id: docSnapshot.id,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          creatorNickname: data.creatorNickname,
          password: data.password || undefined,
          pinnedNotice: data.pinnedNotice,
          participants: data.participants || {}
        };
        
        setChatRoom(updatedChatRoom);
        
        // 사용자가 참여자 목록에서 제거되었는지 확인
        if (user && !data.participants?.[user.id]) {
          // 시스템 메시지 표시
          setMessages(prev => [
            ...prev, 
            {
              id: 'kicked-message',
              text: '관리자에 의해 채팅방에서 퇴장되었습니다. 더 이상 메시지를 보낼 수 없습니다.',
              senderId: 'system',
              senderNickname: '시스템',
              timestamp: new Date(),
              isSystem: true
            }
          ]);
          
          // 3초 후 채팅방 목록으로 자동 이동
          setTimeout(() => {
            router.push('/chat');
          }, 3000);
        }
      }
    });
    
    return () => unsubscribe();
  }, [params.id, user, isAuthorized, router]);

  // 메시지 전송 후 스크롤 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    try {
      setError('');
      
      // 메시지 전송 전 다시 한번 채팅방 정보를 가져와서 참여자 검증
      const chatRoomRef = doc(db, 'chatRooms', params.id);
      const chatRoomSnapshot = await getDoc(chatRoomRef);
      
      if (!chatRoomSnapshot.exists()) {
        setError('채팅방을 찾을 수 없습니다.');
        return;
      }
      
      const chatRoomData = chatRoomSnapshot.data();
      const participants = chatRoomData.participants || {};
      
      // 현재 사용자가 참여자 목록에 없으면 메시지 전송 차단
      if (!participants[user.id]) {
        setError('채팅방 참여자만 메시지를 보낼 수 있습니다.');
        // 참여자가 아님을 UI에 반영
        setChatRoom(prev => {
          if (!prev) return null;
          
          const updatedParticipants = { ...prev.participants };
          delete updatedParticipants[user.id];
          
          return {
            ...prev,
            participants: updatedParticipants
          };
        });
        return;
      }
      
      // 참여자 검증 통과 후 메시지 전송
      const messagesRef = collection(db, 'chatRooms', params.id, 'messages');
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.id,
        senderNickname: user.nickname,
        timestamp: serverTimestamp(),
        isSystem: false
      });
      
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

  // 공지사항 설정 함수
  const handleSaveNotice = async () => {
    if (!user || !isAdmin) return;
    
    try {
      setSavingNotice(true);
      const chatRoomRef = doc(db, 'chatRooms', params.id);
      
      // 공지사항 내용이 있으면 저장, 없으면 제거
      if (noticeContent.trim()) {
        await updateDoc(chatRoomRef, {
          pinnedNotice: {
            content: noticeContent.trim()
          }
        });
        
        // 로컬 상태 업데이트 - UI에는 내용만 표시
        if (chatRoom) {
          setChatRoom({
            ...chatRoom,
            pinnedNotice: {
              content: noticeContent.trim()
            }
          });
        }
      } else {
        // 공지사항 내용이 비어있으면 삭제
        await updateDoc(chatRoomRef, {
          pinnedNotice: deleteField()
        });
        
        // 로컬 상태 업데이트
        if (chatRoom) {
          const updatedChatRoom = { ...chatRoom };
          delete updatedChatRoom.pinnedNotice;
          setChatRoom(updatedChatRoom);
        }
      }
      
      setShowNoticeModal(false);
    } catch (error) {
      console.error('공지사항 저장 실패:', error);
      setError('공지사항을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setSavingNotice(false);
    }
  };

  // 참여자 제거 함수
  const handleRemoveParticipant = async (participantId: string) => {
    if (!isAdmin || !chatRoom) return;
    
    try {
      setRemovingUser(participantId);
      const chatRoomRef = doc(db, 'chatRooms', params.id);
      
      // 채팅방 생성자는 제거할 수 없음
      if (participantId === chatRoom.createdBy) {
        alert('채팅방 생성자는 제거할 수 없습니다.');
        return;
      }
      
      await updateDoc(chatRoomRef, {
        [`participants.${participantId}`]: deleteField()
      });
      
      // 로컬 상태 업데이트
      if (chatRoom && chatRoom.participants) {
        const updatedParticipants = { ...chatRoom.participants };
        delete updatedParticipants[participantId];
        
        setChatRoom({
          ...chatRoom,
          participants: updatedParticipants
        });
      }
      
      // 시스템 메시지 추가
      const removedParticipant = chatRoom.participants?.[participantId];
      if (removedParticipant) {
        const messagesRef = collection(db, 'chatRooms', params.id, 'messages');
        await addDoc(messagesRef, {
          text: `${removedParticipant.nickname || '알 수 없는 사용자'}님이 관리자에 의해 퇴장되었습니다.`,
          senderId: 'system',
          senderNickname: '시스템',
          timestamp: serverTimestamp(),
          isSystem: true
        });
      }
      
      console.log('참여자 제거 완료:', participantId);
      
    } catch (error) {
      console.error('참여자 제거 실패:', error);
      alert('참여자를 제거하는 중 오류가 발생했습니다.');
    } finally {
      setRemovingUser(null);
    }
  };
  
  // 채팅방 설정 변경 함수
  const handleSaveSettings = async () => {
    if (!isAdmin || !chatRoom) return;
    
    try {
      setSavingSettings(true);
      setSettingsError('');
      
      if (!roomNameEdit.trim()) {
        setSettingsError('채팅방 이름을 입력해주세요.');
        return;
      }
      
      const chatRoomRef = doc(db, 'chatRooms', params.id);
      
      const updateData: any = {
        name: roomNameEdit.trim()
      };
      
      // 비밀번호가 변경된 경우에만 업데이트
      if (roomPasswordEdit !== (chatRoom.password || '')) {
        if (roomPasswordEdit.trim()) {
          updateData.password = roomPasswordEdit.trim();
        } else {
          updateData.password = null;
        }
      }
      
      await updateDoc(chatRoomRef, updateData);
      
      // 로컬 상태 업데이트
      setChatRoom({
        ...chatRoom,
        name: roomNameEdit.trim(),
        password: roomPasswordEdit.trim() || undefined
      });
      
      // 시스템 메시지 추가
      const messagesRef = collection(db, 'chatRooms', params.id, 'messages');
      await addDoc(messagesRef, {
        text: `채팅방 설정이 변경되었습니다.`,
        senderId: 'system',
        senderNickname: '시스템',
        timestamp: serverTimestamp(),
        isSystem: true
      });
      
      setShowManageModal(false);
    } catch (error) {
      console.error('채팅방 설정 변경 실패:', error);
      setSettingsError('채팅방 설정을 변경하는 중 오류가 발생했습니다.');
    } finally {
      setSavingSettings(false);
    }
  };
  
  // 모달 열 때 현재 값으로 초기화
  useEffect(() => {
    if (showManageModal && chatRoom) {
      setRoomNameEdit(chatRoom.name);
      setRoomPasswordEdit(chatRoom.password || '');
      console.log('모달 열림, 참여자 데이터:', chatRoom.participants);
    }
  }, [showManageModal, chatRoom]);

  // 참여자 수 계산 함수
  const getParticipantsCount = () => {
    if (!chatRoom?.participants) return 0;
    return Object.keys(chatRoom.participants).length;
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
            <button
              onClick={() => setShowParticipantsModal(true)}
              className="flex items-center gap-1 ml-2 bg-instagram-blue text-white text-xs px-2 py-1 rounded-full hover:bg-instagram-purple transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>{getParticipantsCount()}</span>
            </button>
          </div>
          <button 
            onClick={() => setShowManageModal(true)}
            className="text-instagram-blue hover:text-instagram-purple p-2"
            title="채팅방 관리"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 공지사항 영역 */}
      {chatRoom?.pinnedNotice && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-5xl mx-auto py-2 px-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="text-instagram-red mr-2 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{chatRoom?.pinnedNotice?.content}</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNoticeContent(chatRoom?.pinnedNotice?.content || '');
                    setShowNoticeModal(true);
                  }}
                  className="text-instagram-blue hover:text-instagram-purple text-sm ml-2"
                >
                  수정
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-5xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="instagram-gradient h-10 w-10 rounded-full mx-auto mb-4 opacity-20"></div>
              <p className="text-gray-500">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            messages.map((message) => {
              // 시스템 메시지인 경우
              if (message.isSystem) {
                return (
                  <div key={message.id} className="flex justify-center gap-2">
                    <div className="flex items-center max-w-md">
                      <div className="bg-gray-200 text-gray-800 rounded-md px-4 py-2 text-xs text-center">
                        {message.text}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessage === message.id}
                          className="text-white bg-instagram-red hover:bg-instagram-darkpink p-1.5 rounded-full ml-1 flex items-center justify-center"
                          title="메시지 삭제"
                          style={{ minWidth: '24px', minHeight: '24px' }}
                        >
                          {deletingMessage === message.id ? (
                            <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              
              // 일반 메시지인 경우
              return (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  {isAdmin && message.senderId !== 'system' && message.senderId !== user.id && (
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
                    {message.senderId !== user.id && message.senderId !== 'system' && (
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
              );
            })
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
              placeholder={isParticipant() ? "메시지를 입력하세요..." : "채팅방에 참여할 수 없습니다."}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue focus:border-transparent text-gray-800 bg-white"
              disabled={!isParticipant()}
            />
            <button
              type="submit"
              className={`${isParticipant() 
                ? 'bg-instagram-blue hover:bg-instagram-purple' 
                : 'bg-gray-300 cursor-not-allowed'} 
                text-white px-3 py-2 rounded-md transition-colors min-w-[80px]`}
              disabled={!newMessage.trim() || !isParticipant()}
            >
              전송
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setNoticeContent(chatRoom?.pinnedNotice?.content || '');
                  setShowNoticeModal(true);
                }}
                className="bg-instagram-red text-white px-3 py-2 rounded-md hover:bg-instagram-darkpink transition-colors"
                title="공지사항 작성"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </form>
          {error && <p className="mt-2 text-sm text-instagram-red">{error}</p>}
        </div>
      </div>

      {/* 공지사항 작성 모달 */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">공지사항 {chatRoom?.pinnedNotice ? '수정' : '작성'}</h3>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <textarea
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue text-sm"
              rows={5}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNoticeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  handleSaveNotice();
                  setShowNoticeModal(false);
                }}
                disabled={savingNotice}
                className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple"
              >
                {savingNotice ? '저장 중...' : '저장'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              * 공지사항을 삭제하려면 내용을 비우고 저장하세요.
            </p>
          </div>
        </div>
      )}

      {/* 채팅방 관리 모달 */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">채팅방 관리</h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* 탭 네비게이션 */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setManageTab('participants')}
                className={`py-2 px-4 ${manageTab === 'participants' ? 'text-instagram-blue border-b-2 border-instagram-blue' : 'text-gray-500'}`}
              >
                참여자 관리
              </button>
              {isAdmin && (
                <button
                  onClick={() => setManageTab('settings')}
                  className={`py-2 px-4 ${manageTab === 'settings' ? 'text-instagram-blue border-b-2 border-instagram-blue' : 'text-gray-500'}`}
                >
                  채팅방 설정
                </button>
              )}
            </div>
            
            {/* 참여자 관리 탭 */}
            {manageTab === 'participants' && (
              <div className="max-h-96 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-2">참여자 목록</h4>
                {chatRoom?.participants && Object.keys(chatRoom.participants).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(chatRoom.participants).map(([userId, participant]) => (
                      <div key={userId} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">{participant.nickname || '알 수 없음'}</span>
                          {participant.isAdmin && (
                            <span className="ml-2 text-xs text-white bg-instagram-red px-2 py-0.5 rounded-full">관리자</span>
                          )}
                          {userId === chatRoom.createdBy && (
                            <span className="ml-2 text-xs text-white bg-instagram-blue px-2 py-0.5 rounded-full">방장</span>
                          )}
                        </div>
                        {isAdmin && userId !== user?.id && userId !== chatRoom.createdBy && (
                          <button
                            onClick={() => handleRemoveParticipant(userId)}
                            disabled={removingUser === userId}
                            className="text-instagram-red hover:text-instagram-darkpink"
                            title="참여자 내보내기"
                          >
                            {removingUser === userId ? (
                              <div className="w-4 h-4 border-2 border-instagram-red rounded-full border-t-transparent animate-spin"></div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">참여자가 없습니다.</p>
                )}
              </div>
            )}
            
            {/* 채팅방 설정 탭 */}
            {manageTab === 'settings' && isAdmin && (
              <div>
                <div className="mb-4">
                  <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
                    채팅방 이름
                  </label>
                  <input
                    type="text"
                    id="roomName"
                    value={roomNameEdit}
                    onChange={(e) => setRoomNameEdit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="roomPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 (선택)
                  </label>
                  <input
                    type="password"
                    id="roomPassword"
                    value={roomPasswordEdit}
                    onChange={(e) => setRoomPasswordEdit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
                    placeholder="비밀번호를 입력하세요 (없으면 공개방)"
                  />
                </div>
                
                {settingsError && <p className="text-instagram-red text-sm mb-4">{settingsError}</p>}
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 mr-2"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple"
                  >
                    {savingSettings ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 비밀번호 확인 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">비밀번호 확인</h3>
              <button
                onClick={() => router.push('/chat')}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <p className="mb-4 text-sm text-gray-700">
              이 채팅방은 비밀번호로 보호되어 있습니다. 계속하려면 비밀번호를 입력하세요.
            </p>
            
            <div className="mb-4">
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-instagram-blue"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPassword()}
              />
              {passwordError && <p className="text-instagram-red text-sm mt-1">{passwordError}</p>}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => router.push('/chat')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCheckPassword}
                className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참여자 목록 모달 */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">참여자 목록 ({getParticipantsCount()}명)</h3>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {chatRoom?.participants && Object.keys(chatRoom.participants).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(chatRoom.participants).map(([userId, participant]) => (
                    <div key={userId} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">{participant.nickname || '알 수 없음'}</span>
                        {participant.isAdmin && (
                          <span className="ml-2 text-xs text-white bg-instagram-red px-2 py-0.5 rounded-full">관리자</span>
                        )}
                        {userId === chatRoom.createdBy && (
                          <span className="ml-2 text-xs text-white bg-instagram-blue px-2 py-0.5 rounded-full">방장</span>
                        )}
                        {userId === user?.id && (
                          <span className="ml-2 text-xs text-gray-500">(나)</span>
                        )}
                      </div>
                      {isAdmin && userId !== user?.id && userId !== chatRoom.createdBy && (
                        <button
                          onClick={() => {
                            handleRemoveParticipant(userId);
                            setShowParticipantsModal(false);
                          }}
                          disabled={removingUser === userId}
                          className="text-instagram-red hover:text-instagram-darkpink"
                          title="참여자 내보내기"
                        >
                          {removingUser === userId ? (
                            <div className="w-4 h-4 border-2 border-instagram-red rounded-full border-t-transparent animate-spin"></div>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">참여자가 없습니다.</p>
              )}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="px-4 py-2 bg-instagram-blue text-white rounded-md hover:bg-instagram-purple"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 