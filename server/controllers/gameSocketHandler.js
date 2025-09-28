const { Room, GameRecord, User } = require('../models');
const { getRedisClient } = require('../config/redis');
const { verifyToken } = require('../middleware/auth');

// 게임 상태 관리를 위한 클래스
class GameManager {
    constructor() {
        this.games = new Map(); // roomId -> gameState
        this.redis = null;
    }

    async initialize() {
        try {
            this.redis = getRedisClient();
        } catch (error) {
            console.error('Redis client initialization failed:', error);
        }
    }

    // 게임 상태 생성
    createGameState(room) {
        const gameState = {
            roomId: room._id.toString(),
            status: 'ready',
            currentSentenceIndex: 0,
            sentences: room.sentences,
            players: room.players.map(p => ({
                userId: p.userId.toString(),
                nickname: p.nickname,
                currentSentenceIndex: 0,
                progress: 0,
                wpm: 0,
                accuracy: 100,
                totalCharacters: 0,
                correctCharacters: 0,
                completedSentences: 0,
                isFinished: false,
                finishTime: null,
                keystrokes: []
            })),
            startTime: new Date(),
            endTime: null
        };

        this.games.set(room._id.toString(), gameState);
        
        // Redis에도 저장 (백업용)
        if (this.redis) {
            this.redis.set(
                `game:${room._id}`, 
                JSON.stringify(gameState), 
                'EX', 
                3600 // 1시간 만료
            );
        }

        return gameState;
    }

    // 게임 상태 조회
    getGameState(roomId) {
        return this.games.get(roomId.toString());
    }

    // 게임 상태 업데이트
    updateGameState(roomId, gameState) {
        this.games.set(roomId.toString(), gameState);
        
        // Redis 업데이트
        if (this.redis) {
            this.redis.set(
                `game:${roomId}`, 
                JSON.stringify(gameState), 
                'EX', 
                3600
            );
        }
    }

    // 게임 상태 삭제
    removeGameState(roomId) {
        this.games.delete(roomId.toString());
        
        if (this.redis) {
            this.redis.del(`game:${roomId}`);
        }
    }

    // 플레이어 진행률 계산
    calculateProgress(inputText, targetText) {
        const progress = Math.min((inputText.length / targetText.length) * 100, 100);
        return Math.round(progress * 10) / 10; // 소수점 1자리
    }

    // WPM 계산
    calculateWPM(correctCharacters, timeElapsed) {
        if (timeElapsed <= 0) return 0;
        const minutes = timeElapsed / 60000; // 밀리초를 분으로 변환
        const words = correctCharacters / 5; // 평균 단어 길이 5자로 계산
        return Math.round((words / minutes) * 10) / 10;
    }

    // 정확도 계산
    calculateAccuracy(correctCharacters, totalCharacters) {
        if (totalCharacters === 0) return 100;
        return Math.round((correctCharacters / totalCharacters) * 100 * 10) / 10;
    }

    // 게임 종료 및 결과 저장
    async finishGame(roomId) {
        const gameState = this.getGameState(roomId);
        if (!gameState) return null;

        gameState.status = 'finished';
        gameState.endTime = new Date();

        // 순위 계산 (완료한 문장 수 > WPM > 정확도 순)
        const sortedPlayers = [...gameState.players].sort((a, b) => {
            if (a.completedSentences !== b.completedSentences) {
                return b.completedSentences - a.completedSentences;
            }
            if (a.wpm !== b.wpm) {
                return b.wpm - a.wpm;
            }
            return b.accuracy - a.accuracy;
        });

        // 순위 부여
        sortedPlayers.forEach((player, index) => {
            player.rank = index + 1;
            player.isWinner = index === 0;
        });

        // 게임 기록 저장
        try {
            const gameRecord = new GameRecord({
                roomId: roomId,
                players: gameState.players.map(p => ({
                    userId: p.userId,
                    nickname: p.nickname,
                    finalWpm: p.wpm,
                    finalAccuracy: p.accuracy,
                    completedSentences: p.completedSentences,
                    totalCharacters: p.totalCharacters,
                    correctCharacters: p.correctCharacters,
                    rank: p.rank,
                    isWinner: p.isWinner,
                    finishTime: p.finishTime,
                    keystrokes: p.keystrokes
                })),
                sentences: gameState.sentences,
                winner: sortedPlayers[0].userId,
                gameSettings: {
                    difficulty: gameState.sentences[0]?.difficulty || 'medium',
                    sentenceCount: gameState.sentences.length
                },
                duration: Math.round((gameState.endTime - gameState.startTime) / 1000),
                startedAt: gameState.startTime,
                finishedAt: gameState.endTime
            });

            await gameRecord.save();

            // 사용자 통계 업데이트
            for (const player of gameState.players) {
                try {
                    const user = await User.findById(player.userId);
                    if (user && !user.isGuest) {
                        const result = user.updateGameStats({
                            wpm: player.wpm,
                            accuracy: player.accuracy,
                            isWinner: player.isWinner
                        });
                        
                        await user.save();
                    }
                } catch (error) {
                    console.error(`Failed to update user stats for ${player.userId}:`, error);
                }
            }

            // 방 상태 업데이트
            const room = await Room.findById(roomId);
            if (room) {
                room.gameStatus = 'finished';
                await room.save();
            }

            return gameRecord;

        } catch (error) {
            console.error('Failed to save game record:', error);
            return null;
        }
    }
}

// 게임 매니저 인스턴스
const gameManager = new GameManager();

// Socket.IO 이벤트 핸들러
const gameSocketHandler = (io) => {
    // 인증 미들웨어
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user._id.toString();
            socket.userNickname = user.nickname;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`사용자 연결: ${socket.userNickname} (${socket.userId})`);

        // 방 입장
        socket.on('join-room', async (data) => {
            try {
                const { roomId } = data;
                const room = await Room.findById(roomId)
                    .populate('players.userId', 'nickname');

                if (!room) {
                    socket.emit('error', { message: '존재하지 않는 방입니다.' });
                    return;
                }

                // 플레이어 권한 확인
                const isPlayer = room.players.some(p => 
                    p.userId._id.toString() === socket.userId
                );

                if (!isPlayer) {
                    socket.emit('error', { message: '방에 참가하지 않은 사용자입니다.' });
                    return;
                }

                socket.join(roomId);
                socket.currentRoomId = roomId;

                // 현재 게임 상태 전송
                const gameState = gameManager.getGameState(roomId);
                if (gameState) {
                    socket.emit('game-state', gameState);
                } else {
                    socket.emit('room-joined', room.toJSON());
                }

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: '방 입장 중 오류가 발생했습니다.' });
            }
        });

        // 게임 시작
        socket.on('start-game', async (data) => {
            try {
                const { roomId } = data;
                const room = await Room.findById(roomId)
                    .populate('players.userId', 'nickname');

                if (!room) {
                    socket.emit('error', { message: '존재하지 않는 방입니다.' });
                    return;
                }

                // 방장 권한 확인
                if (room.hostId.toString() !== socket.userId) {
                    socket.emit('error', { message: '방장만 게임을 시작할 수 있습니다.' });
                    return;
                }

                // 게임 상태 생성
                const gameState = gameManager.createGameState(room);
                
                // 모든 플레이어에게 게임 시작 알림
                io.to(roomId).emit('game-started', {
                    message: '게임이 시작됩니다!',
                    gameState
                });

                // 3초 후 첫 번째 문장 전송
                setTimeout(() => {
                    const currentGameState = gameManager.getGameState(roomId);
                    if (currentGameState && currentGameState.status === 'ready') {
                        currentGameState.status = 'playing';
                        currentGameState.startTime = new Date();
                        gameManager.updateGameState(roomId, currentGameState);

                        io.to(roomId).emit('sentence-ready', {
                            sentence: currentGameState.sentences[0],
                            index: 0,
                            total: currentGameState.sentences.length
                        });
                    }
                }, 3000);

            } catch (error) {
                console.error('Start game error:', error);
                socket.emit('error', { message: '게임 시작 중 오류가 발생했습니다.' });
            }
        });

        // 타자 진행률 업데이트
        socket.on('typing-progress', (data) => {
            try {
                const { roomId, sentenceIndex, inputText, keystroke } = data;
                const gameState = gameManager.getGameState(roomId);

                if (!gameState || gameState.status !== 'playing') {
                    return;
                }

                const player = gameState.players.find(p => p.userId === socket.userId);
                if (!player) {
                    return;
                }

                const sentence = gameState.sentences[sentenceIndex];
                if (!sentence) {
                    return;
                }

                // 키스트로크 기록
                if (keystroke) {
                    const isCorrect = inputText.length <= sentence.text.length && 
                        sentence.text.charAt(inputText.length - 1) === keystroke.character;
                    
                    player.keystrokes.push({
                        character: keystroke.character,
                        isCorrect,
                        timestamp: new Date()
                    });
                }

                // 진행률 계산
                player.progress = gameManager.calculateProgress(inputText, sentence.text);
                player.totalCharacters = inputText.length;

                // 정확한 문자 수 계산
                let correctChars = 0;
                for (let i = 0; i < inputText.length && i < sentence.text.length; i++) {
                    if (inputText[i] === sentence.text[i]) {
                        correctChars++;
                    }
                }
                player.correctCharacters = correctChars;

                // WPM 및 정확도 계산
                const timeElapsed = Date.now() - gameState.startTime.getTime();
                player.wpm = gameManager.calculateWPM(player.correctCharacters, timeElapsed);
                player.accuracy = gameManager.calculateAccuracy(
                    player.correctCharacters, 
                    player.totalCharacters
                );

                gameManager.updateGameState(roomId, gameState);

                // 모든 플레이어에게 진행률 브로드캐스트
                io.to(roomId).emit('players-progress', {
                    players: gameState.players.map(p => ({
                        userId: p.userId,
                        nickname: p.nickname,
                        progress: p.progress,
                        wpm: p.wpm,
                        accuracy: p.accuracy,
                        currentSentenceIndex: p.currentSentenceIndex
                    }))
                });

            } catch (error) {
                console.error('Typing progress error:', error);
            }
        });

        // 문장 완성
        socket.on('sentence-completed', async (data) => {
            try {
                const { roomId, sentenceIndex } = data;
                const gameState = gameManager.getGameState(roomId);

                if (!gameState || gameState.status !== 'playing') {
                    return;
                }

                const player = gameState.players.find(p => p.userId === socket.userId);
                if (!player) {
                    return;
                }

                player.completedSentences++;
                player.currentSentenceIndex = sentenceIndex + 1;

                // 모든 문장을 완성한 경우
                if (player.currentSentenceIndex >= gameState.sentences.length) {
                    player.isFinished = true;
                    player.finishTime = new Date();

                    // 승리 알림
                    socket.emit('player-finished', {
                        message: `${player.nickname}님이 완주했습니다!`,
                        isWinner: !gameState.players.some(p => p.isFinished && p.userId !== player.userId)
                    });

                    io.to(roomId).emit('player-completed', {
                        userId: player.userId,
                        nickname: player.nickname,
                        rank: gameState.players.filter(p => p.isFinished).length
                    });
                } else {
                    // 다음 문장 전송
                    socket.emit('next-sentence', {
                        sentence: gameState.sentences[player.currentSentenceIndex],
                        index: player.currentSentenceIndex,
                        total: gameState.sentences.length
                    });
                }

                gameManager.updateGameState(roomId, gameState);

                // 모든 플레이어가 완료했는지 확인
                if (gameState.players.every(p => p.isFinished)) {
                    const gameRecord = await gameManager.finishGame(roomId);
                    
                    io.to(roomId).emit('game-finished', {
                        message: '게임이 종료되었습니다!',
                        results: gameState.players.sort((a, b) => a.rank - b.rank),
                        gameRecord: gameRecord ? gameRecord._id : null
                    });

                    gameManager.removeGameState(roomId);
                }

            } catch (error) {
                console.error('Sentence completed error:', error);
            }
        });

        // 방 나가기
        socket.on('leave-room', () => {
            if (socket.currentRoomId) {
                socket.leave(socket.currentRoomId);
                socket.currentRoomId = null;
            }
        });

        // 연결 해제
        socket.on('disconnect', () => {
            console.log(`사용자 연결 해제: ${socket.userNickname} (${socket.userId})`);
        });
    });

    // 게임 매니저 초기화
    gameManager.initialize();
};

module.exports = gameSocketHandler;