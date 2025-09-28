// 게임 관련 함수 (game.html용 기본 구조)
// 이 파일은 추후 게임 화면에서 사용될 기본 구조입니다.

class GameManager {
    constructor() {
        this.currentRoom = null;
        this.gameState = null;
        this.currentSentence = null;
        this.sentenceIndex = 0;
        this.inputText = '';
        this.startTime = null;
        this.isPlaying = false;
    }

    // 게임 초기화
    initialize(roomId) {
        this.roomId = roomId;
        this.setupSocketHandlers();
        this.setupGameUI();
    }

    // 소켓 이벤트 핸들러 설정
    setupSocketHandlers() {
        socketManager.on('gameStarted', (data) => {
            this.handleGameStarted(data);
        });

        socketManager.on('sentenceReady', (data) => {
            this.handleSentenceReady(data);
        });

        socketManager.on('playersProgress', (data) => {
            this.handlePlayersProgress(data);
        });

        socketManager.on('nextSentence', (data) => {
            this.handleNextSentence(data);
        });

        socketManager.on('playerCompleted', (data) => {
            this.handlePlayerCompleted(data);
        });

        socketManager.on('gameFinished', (data) => {
            this.handleGameFinished(data);
        });
    }

    // 게임 UI 설정
    setupGameUI() {
        // 타자 입력 이벤트 리스너 등록
        const typingInput = document.getElementById('typing-input');
        if (typingInput) {
            typingInput.addEventListener('input', (e) => {
                this.handleTypingInput(e.target.value);
            });

            typingInput.addEventListener('keydown', (e) => {
                this.handleKeyDown(e);
            });
        }
    }

    // 게임 시작 처리
    handleGameStarted(data) {
        this.gameState = data.gameState;
        this.isPlaying = false;
        
        // 게임 시작 카운트다운 표시
        this.showCountdown();
    }

    // 문장 준비 처리
    handleSentenceReady(data) {
        this.currentSentence = data.sentence;
        this.sentenceIndex = data.index;
        this.inputText = '';
        this.startTime = Date.now();
        this.isPlaying = true;

        // 문장 표시
        this.displaySentence(data.sentence.text);
        
        // 입력 필드 포커스
        const typingInput = document.getElementById('typing-input');
        if (typingInput) {
            typingInput.value = '';
            typingInput.focus();
        }
    }

    // 플레이어 진행률 업데이트
    handlePlayersProgress(data) {
        this.updatePlayersProgress(data.players);
    }

    // 다음 문장 처리
    handleNextSentence(data) {
        this.handleSentenceReady(data);
    }

    // 플레이어 완료 처리
    handlePlayerCompleted(data) {
        this.showPlayerCompleted(data);
    }

    // 게임 종료 처리
    handleGameFinished(data) {
        this.isPlaying = false;
        this.showGameResults(data);
    }

    // 타자 입력 처리
    handleTypingInput(inputValue) {
        if (!this.isPlaying || !this.currentSentence) return;

        this.inputText = inputValue;
        
        // 진행률 계산 및 전송
        const progress = this.calculateProgress();
        socketManager.sendTypingProgress(
            this.roomId,
            this.sentenceIndex,
            this.inputText,
            null
        );

        // 문장 완성 확인
        if (this.inputText === this.currentSentence.text) {
            this.completeSentence();
        }

        // 입력 표시 업데이트
        this.updateTypingDisplay();
    }

    // 키 다운 처리
    handleKeyDown(e) {
        if (!this.isPlaying) return;

        // 키스트로크 정보 전송
        const keystroke = {
            character: e.key,
            timestamp: Date.now()
        };

        socketManager.sendTypingProgress(
            this.roomId,
            this.sentenceIndex,
            this.inputText + e.key,
            keystroke
        );
    }

    // 문장 완성 처리
    completeSentence() {
        // 소켓으로 완성 알림
        socketManager.sentenceCompleted(this.roomId, this.sentenceIndex);
        
        // 입력 필드 비활성화
        const typingInput = document.getElementById('typing-input');
        if (typingInput) {
            typingInput.disabled = true;
        }

        // 완성 애니메이션 표시
        this.showCompletionAnimation();
    }

    // 진행률 계산
    calculateProgress() {
        if (!this.currentSentence) return 0;
        return Math.min((this.inputText.length / this.currentSentence.text.length) * 100, 100);
    }

    // 문장 표시
    displaySentence(text) {
        const sentenceDisplay = document.getElementById('sentence-display');
        if (sentenceDisplay) {
            sentenceDisplay.textContent = text;
        }
    }

    // 타자 입력 표시 업데이트
    updateTypingDisplay() {
        const typingDisplay = document.getElementById('typing-display');
        if (!typingDisplay || !this.currentSentence) return;

        const targetText = this.currentSentence.text;
        const inputText = this.inputText;
        
        let html = '';
        
        for (let i = 0; i < targetText.length; i++) {
            const targetChar = targetText[i];
            const inputChar = inputText[i];
            
            if (i < inputText.length) {
                if (inputChar === targetChar) {
                    html += `<span class="correct">${targetChar}</span>`;
                } else {
                    html += `<span class="incorrect">${targetChar}</span>`;
                }
            } else if (i === inputText.length) {
                html += `<span class="current">${targetChar}</span>`;
            } else {
                html += `<span class="pending">${targetChar}</span>`;
            }
        }
        
        typingDisplay.innerHTML = html;
    }

    // 플레이어 진행률 업데이트
    updatePlayersProgress(players) {
        const progressContainer = document.getElementById('players-progress');
        if (!progressContainer) return;

        progressContainer.innerHTML = players.map(player => `
            <div class="player-progress ${player.userId === auth.currentUser?._id ? 'current-user' : ''}">
                <div class="player-info">
                    <span class="player-nickname">${player.nickname}</span>
                    <div class="player-stats">
                        <span class="wpm">${player.wpm} WPM</span>
                        <span class="accuracy">${player.accuracy}%</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${player.progress}%"></div>
                </div>
            </div>
        `).join('');
    }

    // 카운트다운 표시
    showCountdown() {
        let count = 3;
        const countdownElement = document.getElementById('countdown');
        
        if (countdownElement) {
            countdownElement.style.display = 'block';
            
            const interval = setInterval(() => {
                countdownElement.textContent = count;
                count--;
                
                if (count < 0) {
                    clearInterval(interval);
                    countdownElement.style.display = 'none';
                }
            }, 1000);
        }
    }

    // 완성 애니메이션 표시
    showCompletionAnimation() {
        const animation = document.createElement('div');
        animation.className = 'completion-animation';
        animation.textContent = '완성!';
        document.body.appendChild(animation);
        
        setTimeout(() => {
            document.body.removeChild(animation);
        }, 2000);
    }

    // 플레이어 완료 알림
    showPlayerCompleted(data) {
        showToast(`${data.nickname}님이 ${data.rank}등으로 완주했습니다!`, 'info');
    }

    // 게임 결과 표시
    showGameResults(data) {
        createModal('게임 결과', `
            <div class="game-results">
                <h3>🎉 게임 종료!</h3>
                <div class="results-list">
                    ${data.results.map((player, index) => `
                        <div class="result-item ${player.userId === auth.currentUser?._id ? 'current-user' : ''}">
                            <div class="rank">${player.rank}위</div>
                            <div class="player-info">
                                <div class="nickname">${player.nickname}</div>
                                <div class="stats">
                                    ${player.wpm} WPM | ${player.accuracy}% 정확도
                                </div>
                            </div>
                            ${player.isWinner ? '<div class="winner-badge">🏆</div>' : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="result-actions">
                    <button class="btn btn-outline" onclick="location.href='/'">홈으로</button>
                    <button class="btn btn-primary" onclick="location.href='/rooms'">다른 방 찾기</button>
                </div>
            </div>
        `);
    }
}

// 전역 게임 매니저 인스턴스
const gameManager = new GameManager();