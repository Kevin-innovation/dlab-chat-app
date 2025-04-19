# Firebase Security Rules 설정 가이드

Firebase 앱의 보안을 강화하기 위해 다음 Security Rules를 Firebase 콘솔에서 설정해주세요.
이 규칙들은 채팅방 참여자만 메시지를 전송할 수 있도록 하고, 관리자만 특정 작업을 수행할 수 있도록 합니다.

## Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서 규칙
    match /users/{userId} {
      // 인증된 사용자는 자신의 프로필을 읽고 쓸 수 있음
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // 관리자는 모든 사용자 정보를 읽고 쓸 수 있음
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // 채팅방 규칙
    match /chatRooms/{roomId} {
      // 모든 인증된 사용자는 채팅방 목록을 볼 수 있음
      allow read: if request.auth != null;
      
      // 채팅방 생성 조건
      allow create: if request.auth != null;
      
      // 채팅방 수정 조건 - 방장 또는 관리자만 수정 가능
      allow update: if request.auth != null && (
        // 방장인 경우
        resource.data.createdBy == request.auth.uid || 
        // 관리자인 경우
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true)
      );
      
      // 방장 또는 관리자만 채팅방 삭제 가능
      allow delete: if request.auth != null && (
        resource.data.createdBy == request.auth.uid || 
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true)
      );
      
      // 채팅 메시지 규칙
      match /messages/{messageId} {
        // 모든 인증된 사용자는 메시지를 볼 수 있음
        allow read: if request.auth != null;
        
        // 중요: 참여자만 메시지 작성 가능
        allow create: if request.auth != null && 
          exists(/databases/$(database)/documents/chatRooms/$(roomId)) &&
          get(/databases/$(database)/documents/chatRooms/$(roomId)).data.participants[request.auth.uid] != null;
        
        // 관리자 또는 자신의 메시지만 삭제 가능
        allow delete: if request.auth != null && (
          resource.data.senderId == request.auth.uid || 
          (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true)
        );
        
        // 메시지 수정 불가
        allow update: if false;
      }
    }
  }
}
```

## 설정 방법

1. Firebase 콘솔(https://console.firebase.google.com/)에 로그인합니다.
2. 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 "Firestore Database"를 클릭합니다.
4. "Rules" 탭을 클릭합니다.
5. 위의 규칙을 복사하여 붙여넣고 "게시" 버튼을 클릭합니다.

## 추가 보안 설명

이 Security Rules는 다음과 같은 보안 기능을 제공합니다:

1. **참여자 검증**: 채팅방의 participants 필드에 사용자 ID가 포함된 경우에만 메시지 작성 가능
2. **관리자 권한**: 관리자는 모든 사용자 정보와 채팅방을 관리할 수 있음
3. **데이터 보호**: 인증된 사용자만 데이터에 접근 가능
4. **메시지 삭제 제한**: 자신의 메시지나 관리자만 메시지 삭제 가능
5. **메시지 수정 금지**: 한번 전송된 메시지는 수정 불가

위의 규칙을 적용하면 클라이언트 측 검증을 우회하는 시도를 서버에서 차단할 수 있습니다. 