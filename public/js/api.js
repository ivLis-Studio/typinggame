// API 관리 클래스
class ApiManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('accessToken');
    }

    // 토큰 설정
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    }

    // HTTP 요청 헬퍼
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET 요청
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url);
    }

    // POST 요청
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    // PUT 요청
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    // DELETE 요청
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // 인증 관련 API
    async register(userData) {
        return this.post('/api/auth/register', userData);
    }

    async login(credentials) {
        return this.post('/api/auth/login', credentials);
    }

    async loginAsGuest() {
        return this.post('/api/auth/guest');
    }

    async logout() {
        return this.post('/api/auth/logout');
    }

    async getCurrentUser() {
        return this.get('/api/auth/me');
    }

    async checkNickname(nickname) {
        return this.get(`/api/auth/check-nickname/${nickname}`);
    }

    async checkEmail(email) {
        return this.get(`/api/auth/check-email/${email}`);
    }

    // 사용자 관련 API
    async getUserProfile() {
        return this.get('/api/user/profile');
    }

    async updateUserProfile(data) {
        return this.put('/api/user/profile', data);
    }

    async getUserStats(params = {}) {
        return this.get('/api/user/stats', params);
    }

    async getUserGames(params = {}) {
        return this.get('/api/user/games', params);
    }

    async getUserRanking() {
        return this.get('/api/user/ranking');
    }

    // 게임방 관련 API
    async createRoom(roomData) {
        return this.post('/api/room/create', roomData);
    }

    async getRoomList(params = {}) {
        return this.get('/api/room/list', params);
    }

    async getRoom(roomId) {
        return this.get(`/api/room/${roomId}`);
    }

    async joinRoom(roomId) {
        return this.post(`/api/room/${roomId}/join`);
    }

    async leaveRoom(roomId) {
        return this.post(`/api/room/${roomId}/leave`);
    }

    async toggleReady(roomId) {
        return this.post(`/api/room/${roomId}/ready`);
    }

    async startGame(roomId) {
        return this.post(`/api/room/${roomId}/start`);
    }

    async joinRoomByCode(roomCode) {
        return this.post('/api/room/join-by-code', { roomCode });
    }

    // 게임 관련 API
    async getGameHistory(params = {}) {
        return this.get('/api/game/history', params);
    }

    async getGameDetail(gameId) {
        return this.get(`/api/game/${gameId}`);
    }

    async getGameStats(params = {}) {
        return this.get('/api/game/stats/summary', params);
    }

    async getWpmProgress(days = 30) {
        return this.get('/api/game/stats/wmp-progress', { days });
    }

    async getDifficultyPerformance() {
        return this.get('/api/game/stats/difficulty-performance');
    }

    // 문장 관련 API
    async getSentencesByDifficulty(difficulty, params = {}) {
        return this.get(`/api/sentences/${difficulty}`, params);
    }

    async getRandomSentences(params = {}) {
        return this.get('/api/sentences/random', params);
    }

    async searchSentences(params = {}) {
        return this.get('/api/sentences/search', params);
    }

    async getSentenceCategories() {
        return this.get('/api/sentences/categories');
    }

    async getSentenceStats(params = {}) {
        return this.get('/api/sentences/stats/overview', params);
    }

    // 순위표 관련 API
    async getLeaderboard(params = {}) {
        return this.get('/api/leaderboard', params);
    }

    async getWeeklyLeaderboard(params = {}) {
        return this.get('/api/leaderboard/weekly', params);
    }

    async getMonthlyLeaderboard(params = {}) {
        return this.get('/api/leaderboard/monthly', params);
    }

    async getDifficultyLeaderboard(difficulty, params = {}) {
        return this.get(`/api/leaderboard/difficulty/${difficulty}`, params);
    }

    async getLeaderboardStats() {
        return this.get('/api/leaderboard/stats');
    }
}

// 전역 API 인스턴스 생성
const api = new ApiManager();