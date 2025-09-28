#!/bin/bash

# 타자연습 게임 Docker 관리 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 도움말 표시
show_help() {
    cat << EOF
타자연습 게임 Docker 관리 스크립트

사용법:
    $0 [COMMAND]

명령어:
    build       Docker 이미지 빌드
    start       서비스 시작
    stop        서비스 중지
    restart     서비스 재시작
    logs        로그 확인
    status      서비스 상태 확인
    clean       정리 (컨테이너, 이미지, 볼륨 삭제)
    init        데이터베이스 초기화
    backup      데이터베이스 백업
    restore     데이터베이스 복원
    health      헬스체크
    shell       앱 컨테이너 쉘 접속
    help        이 도움말 표시

예시:
    $0 start                # 서비스 시작
    $0 logs app             # 앱 로그 확인
    $0 shell                # 앱 컨테이너 접속
EOF
}

# Docker Compose 파일 확인
check_docker_compose() {
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml 파일을 찾을 수 없습니다."
        exit 1
    fi
}

# Docker 빌드
build() {
    log_info "Docker 이미지 빌드 시작..."
    docker-compose build --no-cache
    log_success "Docker 이미지 빌드 완료"
}

# 서비스 시작
start() {
    log_info "서비스 시작 중..."
    docker-compose up -d
    
    log_info "서비스 상태 확인 중..."
    sleep 10
    docker-compose ps
    
    log_success "서비스가 시작되었습니다."
    log_info "웹 브라우저에서 http://localhost 에 접속하세요."
}

# 서비스 중지
stop() {
    log_info "서비스 중지 중..."
    docker-compose down
    log_success "서비스가 중지되었습니다."
}

# 서비스 재시작
restart() {
    log_info "서비스 재시작 중..."
    docker-compose restart
    log_success "서비스가 재시작되었습니다."
}

# 로그 확인
logs() {
    local service=${1:-}
    if [ -z "$service" ]; then
        log_info "전체 서비스 로그 확인..."
        docker-compose logs -f
    else
        log_info "$service 서비스 로그 확인..."
        docker-compose logs -f "$service"
    fi
}

# 서비스 상태 확인
status() {
    log_info "서비스 상태 확인..."
    docker-compose ps
    
    log_info "\n헬스체크 확인..."
    health
}

# 정리
clean() {
    log_warning "모든 컨테이너, 이미지, 볼륨을 삭제합니다."
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "정리 시작..."
        docker-compose down -v --rmi all --remove-orphans
        docker system prune -f
        log_success "정리 완료"
    else
        log_info "정리 취소됨"
    fi
}

# 데이터베이스 초기화
init_db() {
    log_info "데이터베이스 초기화 중..."
    
    # 앱 컨테이너에서 초기화 스크립트 실행
    docker-compose exec app npm run init-db
    
    log_success "데이터베이스 초기화 완료"
}

# 데이터베이스 백업
backup() {
    local backup_dir="./backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/typinggame_backup_$timestamp.gz"
    
    log_info "데이터베이스 백업 시작..."
    
    # 백업 디렉토리 생성
    mkdir -p "$backup_dir"
    
    # MongoDB 백업
    docker-compose exec mongodb mongodump --authenticationDatabase admin \
        -u admin -p password123 --db typinggame --gzip --archive | \
        gzip > "$backup_file"
    
    log_success "백업 완료: $backup_file"
}

# 데이터베이스 복원
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log_error "백업 파일을 지정해주세요."
        echo "사용법: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "백업 파일을 찾을 수 없습니다: $backup_file"
        exit 1
    fi
    
    log_warning "데이터베이스를 복원하면 기존 데이터가 삭제됩니다."
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "데이터베이스 복원 중..."
        
        gunzip -c "$backup_file" | docker-compose exec -T mongodb mongorestore \
            --authenticationDatabase admin -u admin -p password123 \
            --db typinggame --drop --gzip --archive
        
        log_success "데이터베이스 복원 완료"
    else
        log_info "복원 취소됨"
    fi
}

# 헬스체크
health() {
    local services=("app" "mongodb" "redis")
    
    for service in "${services[@]}"; do
        log_info "$service 헬스체크..."
        
        case $service in
            "app")
                if curl -f -s http://localhost:3000/api/health > /dev/null; then
                    log_success "$service: 정상"
                else
                    log_error "$service: 비정상"
                fi
                ;;
            "mongodb")
                if docker-compose exec mongodb mongosh --eval "db.runCommand({ping: 1})" > /dev/null 2>&1; then
                    log_success "$service: 정상"
                else
                    log_error "$service: 비정상"
                fi
                ;;
            "redis")
                if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
                    log_success "$service: 정상"
                else
                    log_error "$service: 비정상"
                fi
                ;;
        esac
    done
}

# 쉘 접속
shell() {
    local service=${1:-app}
    log_info "$service 컨테이너에 접속..."
    docker-compose exec "$service" /bin/sh
}

# 메인 실행 로직
main() {
    check_docker_compose
    
    case ${1:-help} in
        build)
            build
            ;;
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs $2
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        init)
            init_db
            ;;
        backup)
            backup
            ;;
        restore)
            restore $2
            ;;
        health)
            health
            ;;
        shell)
            shell $2
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 스크립트 실행
main "$@"