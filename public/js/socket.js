// Socket.IO 연결 관리
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.callbacks = {};
    }

    // 소켓 연결
    connect(token) {
        if (this.socket) {
            this.disconnect();
        }

        this.socket = io({
            auth: {
                token: token
            }
        });

        this.setupEventHandlers();
        return this.socket;
    }

    // 소켓 연결 해제
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // 이벤트 핸들러 설정
    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
            this.trigger('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connected = false;
            this.trigger('disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.trigger('error', error);
        });

        // 게임 관련 이벤트
        this.socket.on('game-started', (data) => {
            this.trigger('gameStarted', data);
        });

        this.socket.on('sentence-ready', (data) => {
            this.trigger('sentenceReady', data);
        });

        this.socket.on('players-progress', (data) => {
            this.trigger('playersProgress', data);
        });

        this.socket.on('next-sentence', (data) => {
            this.trigger('nextSentence', data);
        });

        this.socket.on('player-completed', (data) => {
            this.trigger('playerCompleted', data);
        });

        this.socket.on('player-finished', (data) => {
            this.trigger('playerFinished', data);
        });

        this.socket.on('game-finished', (data) => {
            this.trigger('gameFinished', data);
        });

        this.socket.on('room-joined', (data) => {
            this.trigger('roomJoined', data);
        });

        this.socket.on('game-state', (data) => {
            this.trigger('gameState', data);
        });
    }

    // 이벤트 발송
    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        }
    }

    // 이벤트 리스너 등록
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    // 이벤트 리스너 제거
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    // 이벤트 트리거
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    // 방 입장
    joinRoom(roomId) {
        this.emit('join-room', { roomId });
    }

    // 방 나가기
    leaveRoom() {
        this.emit('leave-room');
    }

    // 게임 시작
    startGame(roomId) {
        this.emit('start-game', { roomId });
    }

    // 타자 진행률 전송
    sendTypingProgress(roomId, sentenceIndex, inputText, keystroke) {
        this.emit('typing-progress', {
            roomId,
            sentenceIndex,
            inputText,
            keystroke
        });
    }

    // 문장 완성 알림
    sentenceCompleted(roomId, sentenceIndex) {
        this.emit('sentence-completed', {
            roomId,
            sentenceIndex
        });
    }
}

// 전역 소켓 매니저 인스턴스
const socketManager = new SocketManager();