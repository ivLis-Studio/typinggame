# 대결! 타자연습 웹 서비스

실시간으로 2명 이상의 플레이어가 타자 속도와 정확도를 겨루는 대결 게임 웹 서비스

## 🎯 주요 기능

- **실시간 멀티플레이어 타자 대결**: 최대 8명까지 동시 경쟁
- **다양한 게임 모드**: 난이도별 문장, 사용자 정의 방 설정
- **실시간 진행률 표시**: 타자 속도(WPM)와 정확도 실시간 추적
- **승리 애니메이션**: 문장 완성 시 "닉네임 Win!" 효과
- **순위표 시스템**: 전체/주간/월간 랭킹
- **상세한 통계**: 개인 성과 분석 및 진행률 차트
- **친구 초대**: 비공개 방 코드를 통한 특정 사용자 초대
- **레벨 시스템**: 게임을 통한 경험치 획득과 레벨업

## 🛠 기술 스택

### 백엔드
- **Node.js** + **Express.js**: 웹 서버
- **Socket.IO**: 실시간 통신
- **MongoDB**: 사용자 및 게임 데이터 저장
- **Redis**: 세션 및 실시간 데이터 캐싱
- **JWT**: 토큰 기반 인증
- **bcryptjs**: 비밀번호 암호화

### 프론트엔드
- **HTML5** + **CSS3**: 마크업 및 스타일링
- **Vanilla JavaScript**: 클라이언트 로직
- **Chart.js**: 통계 차트 시각화
- **Font Awesome**: 아이콘
- **Google Fonts**: 웹폰트

### 개발 도구
- **Jest**: 단위 테스트 및 통합 테스트
- **ESLint**: 코드 품질 관리
- **Nodemon**: 개발 서버 자동 재시작

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18 이상
- MongoDB 4.4 이상  
- Redis 6 이상

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd typinggame
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   cp .env.example .env
   # .env 파일을 편집하여 MongoDB, Redis 연결 정보 설정
   ```

4. **데이터베이스 초기화**
   ```bash
   npm run init-db
   ```

5. **서버 실행**
   ```bash
   # 개발 모드
   npm run dev
   
   # 프로덕션 모드
   npm start
   ```

6. **브라우저에서 접속**
   ```
   http://localhost:3000
   ```

## 📖 사용법

### 회원가입 및 로그인
- 이메일과 닉네임으로 회원가입
- 게스트로 즉시 플레이 가능

### 게임 플레이
1. **빠른 시작**: 대기 중인 방에 자동 참가 또는 새 방 생성
2. **방 만들기**: 사용자 정의 설정으로 방 생성
3. **방 참가**: 공개 방 목록에서 선택하거나 방 코드로 참가
4. **게임 진행**: 제시된 문장을 빠르고 정확하게 입력
5. **결과 확인**: 순위와 상세 통계 확인

## 🏗 프로젝트 구조

```
typinggame/
├── server/                 # 백엔드 서버
│   ├── controllers/        # 게임 로직 컨트롤러
│   ├── models/            # MongoDB 데이터 모델
│   ├── routes/            # REST API 라우트
│   ├── middleware/        # 인증 등 미들웨어
│   ├── utils/             # 유틸리티 함수
│   └── config/            # 데이터베이스 설정
├── public/                # 프론트엔드 정적 파일
│   ├── css/               # 스타일시트
│   ├── js/                # JavaScript 모듈
│   └── index.html         # 메인 페이지
├── data/                  # 초기 문장 데이터
├── tests/                 # 테스트 파일
│   ├── unit/              # 단위 테스트
│   └── integration/       # 통합 테스트
├── scripts/               # 유틸리티 스크립트
└── docs/                  # 문서
```

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 테스트 와치 모드
npm run test:watch

# 커버리지 포함 테스트
npm run test:coverage
```

## 📊 API 문서

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인  
- `POST /api/auth/guest` - 게스트 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 게임방
- `GET /api/room/list` - 게임방 목록
- `POST /api/room/create` - 게임방 생성
- `POST /api/room/:id/join` - 게임방 참가
- `POST /api/room/join-by-code` - 방 코드로 참가

### 통계 및 순위
- `GET /api/user/stats` - 사용자 통계
- `GET /api/leaderboard` - 순위표
- `GET /api/game/history` - 게임 기록

상세한 API 문서는 [API.md](docs/API.md)를 참조하세요.

## 🎮 Socket.IO 이벤트

### 클라이언트 → 서버
- `join-room` - 방 입장
- `start-game` - 게임 시작
- `typing-progress` - 타자 진행률 전송
- `sentence-completed` - 문장 완성

### 서버 → 클라이언트  
- `game-started` - 게임 시작 알림
- `sentence-ready` - 문장 준비
- `players-progress` - 플레이어 진행률 업데이트
- `game-finished` - 게임 종료

## 🤝 기여하기

1. 포크 생성
2. 기능 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Socket.IO](https://socket.io/) - 실시간 통신
- [Chart.js](https://www.chartjs.org/) - 차트 라이브러리
- [Font Awesome](https://fontawesome.com/) - 아이콘
- [Google Fonts](https://fonts.google.com/) - 웹폰트