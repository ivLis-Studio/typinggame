# 🐳 Docker로 타자연습 게임 실행하기

이 문서는 Docker와 Docker Compose를 사용하여 타자연습 게임을 실행하는 방법을 설명합니다.

## 📋 사전 요구사항

- Docker 20.10 이상
- Docker Compose 2.0 이상

### Docker 설치 (Ubuntu 22.04)

```bash
# Docker 설치
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 후 확인
docker --version
docker compose version
```

## 🚀 빠른 시작

### 1. 프로젝트 빌드 및 실행

```bash
# Docker 이미지 빌드
./docker.sh build

# 서비스 시작
./docker.sh start
```

### 2. 브라우저에서 접속

```
http://localhost
```

## 🛠 Docker 관리 스크립트 사용법

프로젝트에는 편리한 Docker 관리 스크립트(`docker.sh`)가 포함되어 있습니다.

### 기본 명령어

```bash
# 서비스 시작
./docker.sh start

# 서비스 중지
./docker.sh stop

# 서비스 재시작
./docker.sh restart

# 서비스 상태 확인
./docker.sh status

# 로그 확인 (전체)
./docker.sh logs

# 특정 서비스 로그 확인
./docker.sh logs app
./docker.sh logs mongodb
./docker.sh logs redis
```

### 개발 및 디버깅

```bash
# 앱 컨테이너에 쉘 접속
./docker.sh shell

# MongoDB 컨테이너에 접속
./docker.sh shell mongodb

# 헬스체크 실행
./docker.sh health
```

### 데이터베이스 관리

```bash
# 데이터베이스 초기화 (문장 데이터 삽입)
./docker.sh init

# 데이터베이스 백업
./docker.sh backup

# 데이터베이스 복원
./docker.sh restore ./backups/typinggame_backup_20231028_143000.gz
```

### 정리

```bash
# 모든 컨테이너, 이미지, 볼륨 삭제
./docker.sh clean
```

## 📊 서비스 구성

### 포트 매핑

| 서비스 | 내부 포트 | 외부 포트 | 설명 |
|--------|-----------|-----------|------|
| Nginx | 80 | 80 | 웹 서버 (HTTP) |
| Nginx | 443 | 443 | 웹 서버 (HTTPS) |
| Node.js App | 3000 | 3000 | 애플리케이션 서버 |
| MongoDB | 27017 | 27017 | 데이터베이스 |
| Redis | 6379 | 6379 | 캐시 서버 |

### 환경 변수

Docker 환경에서는 다음 환경 변수가 설정됩니다:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/typinggame?authSource=admin
REDIS_URL=redis://:redis123@redis:6379
JWT_SECRET=typing-game-docker-secret-2023
```

## 🔧 수동 Docker Compose 명령어

스크립트 대신 직접 Docker Compose를 사용할 수도 있습니다:

```bash
# 빌드 및 시작
docker compose up -d --build

# 서비스 중지
docker compose down

# 로그 확인
docker compose logs -f

# 특정 서비스 재시작
docker compose restart app

# 볼륨과 함께 완전 삭제
docker compose down -v
```

## 📁 Docker 구성 파일

### 주요 파일들

- `Dockerfile`: Node.js 애플리케이션 이미지 정의
- `docker-compose.yml`: 전체 서비스 스택 정의
- `.dockerignore`: Docker 빌드에서 제외할 파일 목록
- `docker.sh`: Docker 관리 스크립트
- `nginx/nginx.conf`: Nginx 설정 파일

### 데이터 볼륨

Docker Compose는 다음 볼륨을 생성하여 데이터를 영구 저장합니다:

- `mongodb_data`: MongoDB 데이터
- `redis_data`: Redis 데이터

## 🐛 트러블슈팅

### 컨테이너가 시작되지 않는 경우

```bash
# 서비스 상태 확인
docker compose ps

# 로그 확인
docker compose logs app
docker compose logs mongodb
docker compose logs redis

# 헬스체크 확인
./docker.sh health
```

### 포트 충돌 문제

기본 포트(80, 3000, 27017, 6379)가 이미 사용 중인 경우, `docker-compose.yml`에서 포트를 변경하세요:

```yaml
services:
  nginx:
    ports:
      - "8080:80"  # 80 -> 8080으로 변경
```

### 권한 문제

```bash
# Docker 그룹에 사용자 추가
sudo usermod -aG docker $USER

# 재로그인 후 확인
groups
```

### 메모리 부족

```bash
# Docker 시스템 정리
docker system prune -a

# 사용하지 않는 볼륨 삭제
docker volume prune
```

## 🔒 보안 설정

### 프로덕션 환경을 위한 권장사항

1. **환경 변수 변경**: `.env.docker` 파일의 기본 비밀번호들을 변경하세요
2. **HTTPS 설정**: SSL 인증서를 추가하여 HTTPS를 활성화하세요
3. **네트워크 보안**: 불필요한 포트 노출을 제한하세요
4. **정기 백업**: 데이터베이스를 정기적으로 백업하세요

## 📈 모니터링

### 리소스 사용량 확인

```bash
# 컨테이너 리소스 사용량
docker stats

# 특정 컨테이너 상세 정보
docker inspect typinggame-app
```

### 로그 관리

```bash
# 로그 크기 제한 (docker-compose.yml에 추가)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

이제 Docker를 사용하여 타자연습 게임을 쉽게 실행할 수 있습니다! 🎉