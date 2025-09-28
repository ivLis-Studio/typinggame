# 대결! 타자연습 웹 서비스 실행 가이드

## 시스템 요구사항

- Node.js 18 이상
- MongoDB 4.4 이상
- Redis 6 이상
- npm 또는 yarn

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 필요한 값들을 설정하세요.

```bash
cp .env.example .env
```

### 3. 데이터베이스 설정

#### MongoDB 설치 및 실행
```bash
# Ubuntu/Debian
sudo apt install mongodb

# macOS (Homebrew)
brew install mongodb-community

# MongoDB 실행
mongod
```

#### Redis 설치 및 실행
```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS (Homebrew)
brew install redis

# Redis 실행
redis-server
```

### 4. 데이터베이스 초기화
```bash
npm run init-db
```

### 5. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

### 6. 브라우저에서 확인
```
http://localhost:3000
```

## 개발

### 테스트 실행
```bash
# 전체 테스트 실행
npm test

# 테스트 와치 모드
npm run test:watch

# 커버리지 포함 테스트
npm run test:coverage
```

### 코드 린팅
```bash
# 린트 검사
npm run lint

# 자동 수정
npm run lint:fix
```

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/guest` - 게스트 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 게임방
- `GET /api/room/list` - 게임방 목록
- `POST /api/room/create` - 게임방 생성
- `POST /api/room/:id/join` - 게임방 참가

### 순위표
- `GET /api/leaderboard` - 전체 순위표
- `GET /api/leaderboard/weekly` - 주간 순위표
- `GET /api/leaderboard/monthly` - 월간 순위표

## Socket.IO 이벤트

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

## 프로젝트 구조

```
typinggame/
├── server/                 # 백엔드 서버
│   ├── controllers/        # 컨트롤러
│   ├── models/            # 데이터 모델
│   ├── routes/            # API 라우트
│   ├── middleware/        # 미들웨어
│   ├── utils/             # 유틸리티
│   └── config/            # 설정 파일
├── public/                # 프론트엔드 정적 파일
│   ├── css/               # 스타일시트
│   ├── js/                # JavaScript
│   └── assets/            # 이미지, 폰트 등
├── data/                  # 초기 데이터
├── tests/                 # 테스트 파일
├── scripts/               # 스크립트
└── docs/                  # 문서
```

## 트러블슈팅

### MongoDB 연결 오류
- MongoDB가 실행 중인지 확인
- `.env` 파일의 `MONGODB_URI` 확인
- 포트 충돌 확인 (기본 포트: 27017)

### Redis 연결 오류
- Redis가 실행 중인지 확인
- `.env` 파일의 `REDIS_URL` 확인
- 포트 충돌 확인 (기본 포트: 6379)

### Socket.IO 연결 오류
- CORS 설정 확인
- 브라우저 개발자 도구에서 네트워크 탭 확인
- 방화벽 설정 확인

## 라이센스

MIT License