// 메인 애플리케이션 초기화
class App {
    constructor() {
        this.initialized = false;
    }

    // 앱 초기화
    async initialize() {
        if (this.initialized) return;

        try {
            // 로딩 표시
            showLoading();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 인증 상태 확인
            await auth.checkAuthStatus();

            // 소켓 연결 (로그인된 경우)
            if (auth.isAuthenticated) {
                this.connectSocket();
            }

            // 초기 페이지 로드
            this.loadInitialPage();

            this.initialized = true;
        } catch (error) {
            console.error('App initialization error:', error);
            showToast('애플리케이션 초기화 중 오류가 발생했습니다.', 'error');
        } finally {
            hideLoading();
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 네비게이션 링크
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                showPage(page);
            });
        });

        // 로그인 버튼
        document.getElementById('login-btn')?.addEventListener('click', () => {
            auth.showLoginModal();
        });

        // 게스트 버튼
        document.getElementById('guest-btn')?.addEventListener('click', async () => {
            const success = await auth.loginAsGuest();
            if (success) {
                this.connectSocket();
            }
        });

        // 로그아웃 버튼
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await auth.logout();
            socketManager.disconnect();
            showPage('home');
        });

        // 빠른 시작 버튼
        document.getElementById('quick-start-btn')?.addEventListener('click', () => {
            quickStart();
        });

        // 방 만들기 버튼들
        document.getElementById('create-room-btn')?.addEventListener('click', () => {
            showCreateRoomModal();
        });
        document.getElementById('create-room-btn-2')?.addEventListener('click', () => {
            showCreateRoomModal();
        });

        // 게임방 관련 버튼들
        document.getElementById('refresh-rooms-btn')?.addEventListener('click', () => {
            loadRoomList();
        });

        document.getElementById('join-by-code-btn')?.addEventListener('click', () => {
            this.showJoinByCodeModal();
        });

        // 순위표 탭
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const period = e.target.getAttribute('data-period');
                const difficulty = document.getElementById('leaderboard-difficulty')?.value;
                loadLeaderboard(period, difficulty);
            });
        });

        // 순위표 필터
        document.getElementById('leaderboard-difficulty')?.addEventListener('change', (e) => {
            const period = document.querySelector('.tab-btn.active')?.getAttribute('data-period') || 'all';
            loadLeaderboard(period, e.target.value);
        });

        // 게임방 필터
        document.getElementById('difficulty-filter')?.addEventListener('change', () => {
            loadRoomList();
        });

        document.getElementById('status-filter')?.addEventListener('change', () => {
            loadRoomList();
        });

        // 통계 페이지 로그인 버튼
        document.getElementById('login-for-stats')?.addEventListener('click', () => {
            auth.showLoginModal();
        });

        // 모달 닫기
        document.querySelector('.modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });

        // 인증 상태 변경 리스너
        auth.onAuthChange((user, isAuthenticated) => {
            this.handleAuthChange(user, isAuthenticated);
        });

        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            // Ctrl + / 또는 Cmd + / : 단축키 도움말
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showShortcutsModal();
            }

            // ESC : 모달 닫기
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        // 페이지 가시성 변경 (탭 전환 등)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 페이지가 숨겨졌을 때
                console.log('Page hidden');
            } else {
                // 페이지가 다시 보일 때
                console.log('Page visible');
                if (auth.isAuthenticated && !socketManager.connected) {
                    this.connectSocket();
                }
            }
        });
    }

    // 소켓 연결
    connectSocket() {
        if (auth.isAuthenticated) {
            const token = localStorage.getItem('accessToken');
            if (token) {
                socketManager.connect(token);
            }
        }
    }

    // 인증 상태 변경 처리
    handleAuthChange(user, isAuthenticated) {
        if (isAuthenticated) {
            // 로그인됨
            if (!socketManager.connected) {
                this.connectSocket();
            }
        } else {
            // 로그아웃됨
            socketManager.disconnect();
        }
    }

    // 초기 페이지 로드
    loadInitialPage() {
        // URL 해시에 따른 페이지 결정
        const hash = window.location.hash.substring(1);
        const page = hash || 'home';
        showPage(page);
    }

    // 코드로 방 참가 모달
    showJoinByCodeModal() {
        if (!auth.isAuthenticated) {
            showToast('로그인이 필요합니다.', 'warning');
            return;
        }

        createModal('방 코드로 참가', `
            <form id="join-by-code-form">
                <div class="form-group">
                    <label class="form-label" for="room-code">방 코드</label>
                    <input type="text" id="room-code" class="form-input" 
                           placeholder="6자리 방 코드를 입력하세요" 
                           maxlength="6" required>
                    <div class="form-error"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
                    <button type="submit" class="btn btn-primary">참가하기</button>
                </div>
            </form>
        `);

        // 방 코드 입력 시 대문자 변환
        document.getElementById('room-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        document.getElementById('join-by-code-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const roomCode = document.getElementById('room-code').value.trim();
            
            if (roomCode.length !== 6) {
                document.querySelector('.form-error').textContent = '6자리 방 코드를 입력해주세요.';
                return;
            }

            try {
                const response = await api.joinRoomByCode(roomCode);
                if (response.success) {
                    showToast('방에 참가했습니다.', 'success');
                    closeModal();
                    window.location.href = `/game.html?room=${response.data._id}`;
                }
            } catch (error) {
                document.querySelector('.form-error').textContent = error.message || '방 참가에 실패했습니다.';
            }
        });
    }

    // 단축키 도움말 모달
    showShortcutsModal() {
        createModal('키보드 단축키', `
            <div class="shortcuts-list">
                <div class="shortcut-item">
                    <div class="shortcut-key">Ctrl + /</div>
                    <div class="shortcut-desc">단축키 도움말</div>
                </div>
                <div class="shortcut-item">
                    <div class="shortcut-key">ESC</div>
                    <div class="shortcut-desc">모달 닫기</div>
                </div>
                <div class="shortcut-item">
                    <div class="shortcut-key">Tab</div>
                    <div class="shortcut-desc">다음 요소로 이동</div>
                </div>
                <div class="shortcut-item">
                    <div class="shortcut-key">Enter</div>
                    <div class="shortcut-desc">확인/제출</div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="closeModal()">확인</button>
            </div>
        `);
    }

    // 애플리케이션 상태 복원
    restoreState() {
        // 로컬 스토리지에서 상태 복원
        const savedState = localStorage.getItem('app-state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                // 필요한 상태 복원 로직
            } catch (error) {
                console.error('Failed to restore app state:', error);
            }
        }
    }

    // 애플리케이션 상태 저장
    saveState() {
        const state = {
            currentPage: document.querySelector('.page.active')?.id,
            timestamp: Date.now()
        };
        
        localStorage.setItem('app-state', JSON.stringify(state));
    }

    // 오류 처리
    handleError(error, context = '') {
        console.error(`App error ${context}:`, error);
        
        let message = '알 수 없는 오류가 발생했습니다.';
        
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }

        showToast(message, 'error');
    }
}

// 전역 앱 인스턴스
const app = new App();

// DOM이 로드되면 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});

// 페이지 언로드 시 상태 저장
window.addEventListener('beforeunload', () => {
    app.saveState();
});

// 전역 오류 처리
window.addEventListener('error', (e) => {
    app.handleError(e.error, 'Global error handler');
});

window.addEventListener('unhandledrejection', (e) => {
    app.handleError(e.reason, 'Unhandled promise rejection');
});