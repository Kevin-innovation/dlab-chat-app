// 날짜 포맷팅 함수
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// 사용자 ID 생성 함수 (UUID v4 유사)
export const generateUserId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 로컬 스토리지에서 사용자 정보 가져오기
export const getUserFromStorage = (): { id: string; nickname: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const user = localStorage.getItem('chat-user');
  return user ? JSON.parse(user) : null;
};

// 로컬 스토리지에 사용자 정보 저장
export const saveUserToStorage = (user: { id: string; nickname: string }): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem('chat-user', JSON.stringify(user));
};

// 로컬 스토리지에서 사용자 정보 삭제
export const removeUserFromStorage = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('chat-user');
}; 