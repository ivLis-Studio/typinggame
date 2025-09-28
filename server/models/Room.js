const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomName: {
        type: String,
        required: [true, '방 이름은 필수입니다.'],
        trim: true,
        minlength: [1, '방 이름은 최소 1자 이상이어야 합니다.'],
        maxlength: [50, '방 이름은 최대 50자까지 가능합니다.']
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '방장 정보는 필수입니다.']
    },
    maxPlayers: {
        type: Number,
        required: true,
        min: [2, '최소 2명의 플레이어가 필요합니다.'],
        max: [8, '최대 8명까지 참가 가능합니다.'],
        default: 4
    },
    currentPlayers: {
        type: Number,
        default: 0,
        min: 0
    },
    difficulty: {
        type: String,
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: '난이도는 easy, medium, hard 중 하나여야 합니다.'
        },
        default: 'medium'
    },
    sentenceCount: {
        type: Number,
        required: true,
        min: [5, '최소 5개의 문장이 필요합니다.'],
        max: [50, '최대 50개의 문장까지 가능합니다.'],
        default: 10
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    roomCode: {
        type: String,
        unique: true,
        sparse: true // 비공개 방만 roomCode를 가짐
    },
    gameStatus: {
        type: String,
        enum: {
            values: ['waiting', 'ready', 'playing', 'finished'],
            message: '게임 상태는 waiting, ready, playing, finished 중 하나여야 합니다.'
        },
        default: 'waiting'
    },
    players: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        nickname: {
            type: String,
            required: true
        },
        isReady: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    sentences: [{
        text: String,
        difficulty: String
    }],
    gameSettings: {
        timeLimit: {
            type: Number,
            default: 0, // 0은 무제한
            min: 0
        },
        allowReconnect: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

// 인덱스 설정
roomSchema.index({ gameStatus: 1, isPrivate: 1 });
roomSchema.index({ hostId: 1 });
roomSchema.index({ roomCode: 1 });
roomSchema.index({ createdAt: -1 });

// 방 코드 생성 (비공개 방용)
roomSchema.methods.generateRoomCode = function() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.roomCode = result;
    return result;
};

// 플레이어 추가
roomSchema.methods.addPlayer = function(user) {
    // 이미 참가한 플레이어인지 확인
    const existingPlayer = this.players.find(p => p.userId.toString() === user._id.toString());
    if (existingPlayer) {
        throw new Error('이미 참가한 플레이어입니다.');
    }

    // 방이 가득 찼는지 확인
    if (this.currentPlayers >= this.maxPlayers) {
        throw new Error('방이 가득 찼습니다.');
    }

    // 게임이 진행 중인지 확인
    if (this.gameStatus === 'playing') {
        throw new Error('게임이 진행 중입니다.');
    }

    this.players.push({
        userId: user._id,
        nickname: user.nickname,
        isReady: false
    });
    
    this.currentPlayers += 1;
    
    return this;
};

// 플레이어 제거
roomSchema.methods.removePlayer = function(userId) {
    const playerIndex = this.players.findIndex(p => p.userId.toString() === userId.toString());
    
    if (playerIndex === -1) {
        throw new Error('참가하지 않은 플레이어입니다.');
    }

    this.players.splice(playerIndex, 1);
    this.currentPlayers -= 1;

    // 방장이 나간 경우 다른 플레이어를 방장으로 변경
    if (this.hostId.toString() === userId.toString() && this.players.length > 0) {
        this.hostId = this.players[0].userId;
    }

    return this;
};

// 플레이어 준비 상태 토글
roomSchema.methods.togglePlayerReady = function(userId) {
    const player = this.players.find(p => p.userId.toString() === userId.toString());
    
    if (!player) {
        throw new Error('참가하지 않은 플레이어입니다.');
    }

    player.isReady = !player.isReady;
    
    return this;
};

// 모든 플레이어가 준비되었는지 확인
roomSchema.methods.allPlayersReady = function() {
    if (this.players.length < 2) return false;
    return this.players.every(player => player.isReady);
};

// 게임 시작 가능한지 확인
roomSchema.methods.canStartGame = function() {
    return this.players.length >= 2 && 
           this.allPlayersReady() && 
           this.gameStatus === 'waiting';
};

// 방 정보 요약 (공개 방 목록용)
roomSchema.methods.getSummary = function() {
    return {
        _id: this._id,
        roomName: this.roomName,
        currentPlayers: this.currentPlayers,
        maxPlayers: this.maxPlayers,
        difficulty: this.difficulty,
        gameStatus: this.gameStatus,
        isPrivate: this.isPrivate,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('Room', roomSchema);