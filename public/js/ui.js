// UI 유틸리티 함수들

// 페이지 전환
function showPage(pageId) {
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 선택된 페이지 표시
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 네비게이션 활성화 상태 업데이트
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 페이지별 초기화 함수 호출
    switch (pageId) {
        case 'rooms':
            loadRoomList();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'stats':
            loadUserStats();
            break;
    }
}

// 모달 생성
function createModal(title, content) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modalOverlay.classList.add('active');

    return modalOverlay;
}

// 모달 닫기
function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.remove('active');
}

// 토스트 메시지 표시
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // 5초 후 자동 제거
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);

    // 클릭시 제거
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// 토스트 아이콘 반환
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// 로딩 표시/숨기기
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 날짜 포맷팅
function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return d.toLocaleDateString('ko-KR');
}

// 게임방 목록 로드
async function loadRoomList(page = 1) {
    try {
        showLoading();
        
        const params = { page, limit: 12 };
        
        // 필터 적용
        const difficultyFilter = document.getElementById('difficulty-filter')?.value;
        const statusFilter = document.getElementById('status-filter')?.value;
        
        if (difficultyFilter) params.difficulty = difficultyFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await api.getRoomList(params);
        
        if (response.success) {
            renderRoomList(response.data.rooms);
            renderPagination(response.data.pagination, 'rooms-pagination', loadRoomList);
        }
    } catch (error) {
        showToast('게임방 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 게임방 목록 렌더링
function renderRoomList(rooms) {
    const roomsList = document.getElementById('rooms-list');
    
    if (!rooms || rooms.length === 0) {
        roomsList.innerHTML = `
            <div class="empty-state">
                <p>현재 진행 중인 게임방이 없습니다.</p>
                <button class="btn btn-primary" onclick="showCreateRoomModal()">
                    <i class="fas fa-plus"></i> 방 만들기
                </button>
            </div>
        `;
        return;
    }

    roomsList.innerHTML = rooms.map(room => `
        <div class="room-card">
            <div class="room-header">
                <div>
                    <div class="room-name">${room.roomName}</div>
                    <div class="room-host">방장: ${room.host.nickname}</div>
                </div>
                <span class="room-status ${room.gameStatus}">${getStatusText(room.gameStatus)}</span>
            </div>
            <div class="room-info">
                <div class="room-players">
                    <i class="fas fa-users"></i>
                    ${room.currentPlayers}/${room.maxPlayers}명
                </div>
                <div class="room-difficulty">
                    <span class="difficulty-badge ${room.difficulty}">${getDifficultyText(room.difficulty)}</span>
                </div>
            </div>
            <div class="room-actions">
                <button class="btn btn-primary" onclick="joinRoom('${room._id}')"
                        ${room.currentPlayers >= room.maxPlayers || room.gameStatus === 'playing' ? 'disabled' : ''}>
                    ${room.gameStatus === 'playing' ? '게임 중' : '참가하기'}
                </button>
            </div>
        </div>
    `).join('');
}

// 순위표 로드
async function loadLeaderboard(period = 'all', difficulty = '') {
    try {
        showLoading();
        
        const params = { period, limit: 50 };
        if (difficulty) params.difficulty = difficulty;

        let response;
        switch (period) {
            case 'weekly':
                response = await api.getWeeklyLeaderboard(params);
                break;
            case 'monthly':
                response = await api.getMonthlyLeaderboard(params);
                break;
            default:
                response = await api.getLeaderboard(params);
        }
        
        if (response.success) {
            renderLeaderboard(response.data.leaderboard, response.data.userRank);
        }
    } catch (error) {
        showToast('순위표를 불러오는데 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 순위표 렌더링
function renderLeaderboard(leaderboard, userRank) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!leaderboard || leaderboard.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <p>순위표 데이터가 없습니다.</p>
            </div>
        `;
        return;
    }

    const header = `
        <div class="leaderboard-header">
            <div>순위</div>
            <div>플레이어</div>
            <div class="wpm-header">최고 WPM</div>
            <div>정확도</div>
            <div class="games-header">게임 수</div>
        </div>
    `;

    const items = leaderboard.map((player, index) => `
        <div class="leaderboard-item ${player._id === auth.currentUser?._id ? 'current-user' : ''}">
            <div class="rank ${index < 3 ? 'top3' : ''}">${index + 1}</div>
            <div class="player-info">
                <span class="player-nickname">${player.nickname}</span>
            </div>
            <div class="wpm">${player.bestWpm}</div>
            <div class="accuracy">${player.avgAccuracy.toFixed(1)}%</div>
            <div class="games">${player.totalGames}</div>
        </div>
    `).join('');

    leaderboardList.innerHTML = header + items;

    // 사용자 순위 표시
    if (userRank) {
        showToast(`현재 순위: ${userRank}위`, 'info');
    }
}

// 사용자 통계 로드
async function loadUserStats() {
    const statsContent = document.getElementById('stats-content');
    const guestMessage = document.getElementById('guest-stats-message');

    if (!auth.isAuthenticated) {
        statsContent.style.display = 'none';
        guestMessage.style.display = 'block';
        return;
    }

    if (auth.currentUser.isGuest) {
        statsContent.style.display = 'none';
        guestMessage.style.display = 'block';
        return;
    }

    statsContent.style.display = 'block';
    guestMessage.style.display = 'none';

    try {
        showLoading();
        
        const [statsResponse, gamesResponse] = await Promise.all([
            api.getUserStats(),
            api.getUserGames({ limit: 10 })
        ]);

        if (statsResponse.success) {
            renderUserStats(statsResponse.data.basic);
            renderRecentGames(gamesResponse.data.games);
            
            // WPM 차트 로드
            loadWpmChart();
        }
    } catch (error) {
        showToast('통계를 불러오는데 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 사용자 통계 렌더링
function renderUserStats(stats) {
    document.getElementById('total-games').textContent = stats.totalGames;
    document.getElementById('win-rate').textContent = `${stats.winRate}%`;
    document.getElementById('best-wpm').textContent = stats.bestWpm;
    document.getElementById('avg-accuracy').textContent = `${stats.averageAccuracy}%`;
}

// 최근 게임 렌더링
function renderRecentGames(games) {
    const recentGamesList = document.getElementById('recent-games-list');
    
    if (!games || games.length === 0) {
        recentGamesList.innerHTML = '<p>최근 게임 기록이 없습니다.</p>';
        return;
    }

    recentGamesList.innerHTML = games.map(game => `
        <div class="game-item">
            <div class="game-info">
                <div class="game-date">${formatDate(game.playedAt)}</div>
                <div class="game-difficulty ${game.difficulty}">${getDifficultyText(game.difficulty)}</div>
            </div>
            <div class="game-stats">
                <div class="game-stat">
                    <span class="game-stat-label">WPM</span>
                    <span class="game-stat-value">${game.wpm}</span>
                </div>
                <div class="game-stat">
                    <span class="game-stat-label">정확도</span>
                    <span class="game-stat-value">${game.accuracy}%</span>
                </div>
                <div class="game-stat">
                    <span class="game-stat-label">순위</span>
                    <span class="game-stat-value">${game.rank}위</span>
                </div>
            </div>
        </div>
    `).join('');
}

// WPM 차트 로드
async function loadWpmChart() {
    try {
        const response = await api.getWpmProgress(30);
        if (response.success) {
            renderWpmChart(response.data);
        }
    } catch (error) {
        console.error('WPM chart load error:', error);
    }
}

// WPM 차트 렌더링
function renderWmpChart(data) {
    const ctx = document.getElementById('wmp-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'WPM',
                data: data.map(d => d.wpm),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 페이지네이션 렌더링
function renderPagination(pagination, containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { current, total } = pagination;
    const maxVisible = 5;
    
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    let html = '';
    
    // 이전 버튼
    html += `<button onclick="${callback.name}(${current - 1})" ${current === 1 ? 'disabled' : ''}>이전</button>`;
    
    // 첫 페이지
    if (start > 1) {
        html += `<button onclick="${callback.name}(1)">1</button>`;
        if (start > 2) html += '<span>...</span>';
    }
    
    // 페이지 번호들
    for (let i = start; i <= end; i++) {
        html += `<button onclick="${callback.name}(${i})" ${i === current ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // 마지막 페이지
    if (end < total) {
        if (end < total - 1) html += '<span>...</span>';
        html += `<button onclick="${callback.name}(${total})">${total}</button>`;
    }
    
    // 다음 버튼
    html += `<button onclick="${callback.name}(${current + 1})" ${current === total ? 'disabled' : ''}>다음</button>`;
    
    container.innerHTML = html;
}

// 유틸리티 함수들
function getStatusText(status) {
    switch (status) {
        case 'waiting': return '대기중';
        case 'ready': return '준비완료';
        case 'playing': return '게임중';
        case 'finished': return '종료';
        default: return status;
    }
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 'easy': return '쉬움';
        case 'medium': return '보통';
        case 'hard': return '어려움';
        default: return difficulty;
    }
}

// 방 만들기 모달
function showCreateRoomModal() {
    if (!auth.isAuthenticated) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }

    createModal('방 만들기', `
        <form id="create-room-form">
            <div class="form-group">
                <label class="form-label" for="room-name">방 이름</label>
                <input type="text" id="room-name" class="form-input" required maxlength="50">
            </div>
            <div class="form-group">
                <label class="form-label" for="max-players">최대 인원</label>
                <select id="max-players" class="form-select">
                    <option value="2">2명</option>
                    <option value="3">3명</option>
                    <option value="4" selected>4명</option>
                    <option value="5">5명</option>
                    <option value="6">6명</option>
                    <option value="7">7명</option>
                    <option value="8">8명</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" for="difficulty">난이도</label>
                <select id="difficulty" class="form-select">
                    <option value="easy">쉬움</option>
                    <option value="medium" selected>보통</option>
                    <option value="hard">어려움</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" for="sentence-count">문장 수</label>
                <select id="sentence-count" class="form-select">
                    <option value="5">5개</option>
                    <option value="10" selected>10개</option>
                    <option value="15">15개</option>
                    <option value="20">20개</option>
                    <option value="30">30개</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" id="is-private"> 비공개 방
                </label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="closeModal()">취소</button>
                <button type="submit" class="btn btn-primary">방 만들기</button>
            </div>
        </form>
    `);

    document.getElementById('create-room-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const roomData = {
            roomName: document.getElementById('room-name').value.trim(),
            maxPlayers: parseInt(document.getElementById('max-players').value),
            difficulty: document.getElementById('difficulty').value,
            sentenceCount: parseInt(document.getElementById('sentence-count').value),
            isPrivate: document.getElementById('is-private').checked
        };

        try {
            const response = await api.createRoom(roomData);
            if (response.success) {
                showToast('방이 생성되었습니다.', 'success');
                closeModal();
                
                // 게임 페이지로 이동
                window.location.href = `/game.html?room=${response.data._id}`;
            }
        } catch (error) {
            showToast(error.message || '방 생성에 실패했습니다.', 'error');
        }
    });
}

// 방 참가
async function joinRoom(roomId) {
    if (!auth.isAuthenticated) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }

    try {
        const response = await api.joinRoom(roomId);
        if (response.success) {
            showToast('방에 참가했습니다.', 'success');
            // 게임 페이지로 이동
            window.location.href = `/game.html?room=${roomId}`;
        }
    } catch (error) {
        showToast(error.message || '방 참가에 실패했습니다.', 'error');
    }
}

// 빠른 시작
async function quickStart() {
    if (!auth.isAuthenticated) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }

    try {
        showLoading();
        
        // 대기 중인 방 찾기
        const response = await api.getRoomList({ status: 'waiting', limit: 1 });
        
        if (response.success && response.data.rooms.length > 0) {
            const room = response.data.rooms[0];
            await joinRoom(room._id);
        } else {
            // 대기 중인 방이 없으면 새로 생성
            const roomData = {
                roomName: `${auth.currentUser.nickname}의 방`,
                maxPlayers: 4,
                difficulty: 'medium',
                sentenceCount: 10,
                isPrivate: false
            };
            
            const createResponse = await api.createRoom(roomData);
            if (createResponse.success) {
                window.location.href = `/game.html?room=${createResponse.data._id}`;
            }
        }
    } catch (error) {
        showToast(error.message || '빠른 시작에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}