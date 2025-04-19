# DLAB Chat-app

이 프로젝트는 Next.js와 Firebase를 사용하여 개발된 실시간 채팅 애플리케이션입니다. 별도의 회원가입 없이 닉네임만으로 참여할 수 있는 채팅 서비스를 제공합니다.

## 기술 스택

- Frontend: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- Backend: Firebase (Firestore)
- 배포: Vercel
- UI 디자인: 인스타그램 스타일 테마

## 주요 기능

1. **닉네임 기반 참여**: 사용자는 별도의 회원가입 없이 닉네임만으로 채팅에 참여할 수 있습니다.
2. **채팅방 생성 및 관리**: 사용자는 새로운 채팅방을 생성하고 참여할 수 있습니다.
3. **실시간 메시지 전송**: Firebase Firestore를 활용한 실시간 메시지 전송 및 수신 기능을 제공합니다.
4. **반응형 디자인**: 모바일부터 데스크톱까지 다양한 화면 크기에 최적화된 UI를 제공합니다.
5. **관리자 모드**: 특정 비밀번호(4490)를 입력하여 관리자 모드에 접근할 수 있으며, 채팅방 삭제 및 메시지 삭제 기능을 사용할 수 있습니다.
6. **인스타그램 스타일 UI**: 인스타그램에서 영감을 받은 모던한 UI 디자인을 적용했습니다.

## 설치 및 실행 방법

1. 저장소 클론:
   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. Firebase 설정:
   - `.env.local.example` 파일을 참고하여 `.env.local` 파일을 생성하고 Firebase 설정 값을 입력하세요.

4. 개발 서버 실행:
   ```bash
   npm run dev
   ```

5. 브라우저에서 `chat-app-zeta-plum.vercel.app`으로 접속
