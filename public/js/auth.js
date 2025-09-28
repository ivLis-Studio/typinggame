// 인증 관리 클래스
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authCallbacks = [];
    }

    // 인증 상태 변경 리스너 등록
    onAuthChange(callback) {
        this.authCallbacks.push(callback);
    }

    // 인증 상태 변경 알림
    notifyAuthChange() {
        this.authCallbacks.forEach(callback => callback(this.currentUser, this.isAuthenticated));
    }

    // 로그인 처리
    async login(credentials) {
        try {
            const response = await api.login(credentials);
            
            if (response.success) {
                const { user, accessToken, refreshToken } = response.data;
                
                // 토큰 저장
                api.setToken(accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }

                // 사용자 정보 설정
                this.currentUser = user;
                this.isAuthenticated = true;

                // UI 업데이트
                this.updateUserUI();
                this.notifyAuthChange();

                showToast('로그인되었습니다.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || '로그인에 실패했습니다.', 'error');
            return false;
        }
    }

    // 회원가입 처리
    async register(userData) {
        try {
            const response = await api.register(userData);
            
            if (response.success) {
                const { user, accessToken, refreshToken } = response.data;
                
                // 토큰 저장
                api.setToken(accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }

                // 사용자 정보 설정
                this.currentUser = user;
                this.isAuthenticated = true;

                // UI 업데이트
                this.updateUserUI();
                this.notifyAuthChange();

                showToast('회원가입이 완료되었습니다.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || '회원가입에 실패했습니다.', 'error');
            return false;
        }
    }

    // 게스트 로그인
    async loginAsGuest() {
        try {
            const response = await api.loginAsGuest();
            
            if (response.success) {
                const { user, accessToken } = response.data;
                
                // 토큰 저장
                api.setToken(accessToken);

                // 사용자 정보 설정
                this.currentUser = user;
                this.isAuthenticated = true;

                // UI 업데이트
                this.updateUserUI();
                this.notifyAuthChange();

                showToast('게스트로 로그인되었습니다.', 'success');
                return true;
            }
            return false;
        } catch (error) {
            showToast(error.message || '게스트 로그인에 실패했습니다.', 'error');
            return false;
        }
    }

    // 로그아웃 처리
    async logout() {
        try {
            if (this.isAuthenticated) {
                await api.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // 토큰 제거
            api.setToken(null);
            localStorage.removeItem('refreshToken');

            // 사용자 정보 초기화
            this.currentUser = null;
            this.isAuthenticated = false;

            // UI 업데이트
            this.updateUserUI();
            this.notifyAuthChange();

            showToast('로그아웃되었습니다.', 'success');
        }
    }

    // 현재 사용자 정보 확인
    async checkAuthStatus() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return false;
        }

        try {
            const response = await api.getCurrentUser();
            if (response.success) {
                this.currentUser = response.data.user;
                this.isAuthenticated = true;
                this.updateUserUI();
                this.notifyAuthChange();
                return true;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // 토큰이 유효하지 않은 경우 정리
            this.logout();
        }
        
        return false;
    }

    // 사용자 UI 업데이트
    updateUserUI() {
        const userInfo = document.getElementById('user-info');
        const authButtons = document.getElementById('auth-buttons');
        const userNickname = document.querySelector('.user-nickname');
        const userLevel = document.querySelector('.user-level');

        if (this.isAuthenticated && this.currentUser) {
            userInfo.style.display = 'flex';
            authButtons.style.display = 'none';
            
            userNickname.textContent = this.currentUser.nickname;
            userLevel.textContent = `LV.${this.currentUser.level}`;
            
            if (this.currentUser.isGuest) {
                userLevel.textContent += ' (게스트)';
            }
        } else {
            userInfo.style.display = 'none';
            authButtons.style.display = 'flex';
        }
    }

    // 로그인 모달 표시
    showLoginModal() {
        const modal = createModal('로그인', `
            <form id="login-form">
                <div class="form-group">
                    <label class="form-label" for="login-email">이메일</label>
                    <input type="email" id="login-email" class="form-input" required>
                    <div class="form-error"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="login-password">비밀번호</label>
                    <input type="password" id="login-password" class="form-input" required>
                    <div class="form-error"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
                    <button type="submit" class="btn btn-primary">로그인</button>
                </div>
            </form>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin-bottom: 12px; color: #666;">계정이 없으신가요?</p>
                <button type="button" class="btn btn-outline" onclick="auth.showRegisterModal()">회원가입</button>
            </div>
        `);

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const success = await this.login({ email, password });
            if (success) {
                closeModal();
            }
        });
    }

    // 회원가입 모달 표시
    showRegisterModal() {
        const modal = createModal('회원가입', `
            <form id="register-form">
                <div class="form-group">
                    <label class="form-label" for="register-nickname">닉네임</label>
                    <input type="text" id="register-nickname" class="form-input" required 
                           minlength="2" maxlength="20">
                    <div class="form-error"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="register-email">이메일</label>
                    <input type="email" id="register-email" class="form-input" required>
                    <div class="form-error"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="register-password">비밀번호</label>
                    <input type="password" id="register-password" class="form-input" required 
                           minlength="6">
                    <div class="form-error"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="register-password-confirm">비밀번호 확인</label>
                    <input type="password" id="register-password-confirm" class="form-input" required>
                    <div class="form-error"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
                    <button type="submit" class="btn btn-primary">회원가입</button>
                </div>
            </form>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin-bottom: 12px; color: #666;">이미 계정이 있으신가요?</p>
                <button type="button" class="btn btn-outline" onclick="auth.showLoginModal()">로그인</button>
            </div>
        `);

        // 실시간 유효성 검사
        const nicknameInput = document.getElementById('register-nickname');
        const emailInput = document.getElementById('register-email');
        
        let nicknameTimeout;
        nicknameInput.addEventListener('input', () => {
            clearTimeout(nicknameTimeout);
            nicknameTimeout = setTimeout(async () => {
                const nickname = nicknameInput.value.trim();
                if (nickname.length >= 2) {
                    try {
                        const response = await api.checkNickname(nickname);
                        const errorDiv = nicknameInput.nextElementSibling;
                        if (!response.data.isAvailable) {
                            errorDiv.textContent = '이미 사용 중인 닉네임입니다.';
                            nicknameInput.classList.add('error');
                        } else {
                            errorDiv.textContent = '';
                            nicknameInput.classList.remove('error');
                        }
                    } catch (error) {
                        console.error('Nickname check error:', error);
                    }
                }
            }, 500);
        });

        let emailTimeout;
        emailInput.addEventListener('input', () => {
            clearTimeout(emailTimeout);
            emailTimeout = setTimeout(async () => {
                const email = emailInput.value.trim();
                if (email && email.includes('@')) {
                    try {
                        const response = await api.checkEmail(email);
                        const errorDiv = emailInput.nextElementSibling;
                        if (!response.data.isAvailable) {
                            errorDiv.textContent = '이미 사용 중인 이메일입니다.';
                            emailInput.classList.add('error');
                        } else {
                            errorDiv.textContent = '';
                            emailInput.classList.remove('error');
                        }
                    } catch (error) {
                        console.error('Email check error:', error);
                    }
                }
            }, 500);
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nickname = document.getElementById('register-nickname').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;

            // 비밀번호 확인
            if (password !== passwordConfirm) {
                const errorDiv = document.getElementById('register-password-confirm').nextElementSibling;
                errorDiv.textContent = '비밀번호가 일치하지 않습니다.';
                return;
            }

            const success = await this.register({ nickname, email, password });
            if (success) {
                closeModal();
            }
        });
    }

    // 닉네임 중복 검사
    async checkNickname(nickname) {
        try {
            const response = await api.checkNickname(nickname);
            return response.data.isAvailable;
        } catch (error) {
            console.error('Nickname check error:', error);
            return false;
        }
    }

    // 이메일 중복 검사
    async checkEmail(email) {
        try {
            const response = await api.checkEmail(email);
            return response.data.isAvailable;
        } catch (error) {
            console.error('Email check error:', error);
            return false;
        }
    }
}

// 전역 인증 관리자 인스턴스
const auth = new AuthManager();