const mongoose = require('mongoose');

const gameRecordSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, '방 정보는 필수입니다.']
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
        finalWpm: {
            type: Number,
            required: true,
            min: 0
        },
        finalAccuracy: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        completedSentences: {
            type: Number,
            required: true,
            min: 0
        },
        totalCharacters: {
            type: Number,
            required: true,
            min: 0
        },
        correctCharacters: {
            type: Number,
            required: true,
            min: 0
        },
        rank: {
            type: Number,
            required: true,
            min: 1
        },
        isWinner: {
            type: Boolean,
            default: false
        },
        finishTime: Date,
        keystrokes: [{
            character: String,
            isCorrect: Boolean,
            timestamp: Date
        }]
    }],
    sentences: [{
        text: {
            type: String,
            required: true
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            required: true
        },
        index: {
            type: Number,
            required: true
        }
    }],
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameSettings: {
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            required: true
        },
        sentenceCount: {
            type: Number,
            required: true
        },
        timeLimit: {
            type: Number,
            default: 0
        }
    },
    duration: {
        type: Number, // 게임 진행 시간 (초)
        required: true,
        min: 0
    },
    startedAt: {
        type: Date,
        required: true
    },
    finishedAt: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// 인덱스 설정
gameRecordSchema.index({ 'players.userId': 1 });
gameRecordSchema.index({ winner: 1 });
gameRecordSchema.index({ startedAt: -1 });
gameRecordSchema.index({ 'gameSettings.difficulty': 1 });
gameRecordSchema.index({ 'players.finalWpm': -1 });

// 게임 통계 계산 메서드
gameRecordSchema.methods.calculatePlayerStats = function(userId) {
    const player = this.players.find(p => p.userId.toString() === userId.toString());
    if (!player) return null;

    return {
        wpm: player.finalWpm,
        accuracy: player.finalAccuracy,
        rank: player.rank,
        isWinner: player.isWinner,
        completedSentences: player.completedSentences,
        totalTime: this.duration,
        gameDate: this.startedAt
    };
};

// 전체 게임 통계 계산
gameRecordSchema.statics.getPlayerStats = async function(userId, options = {}) {
    const { startDate, endDate, difficulty } = options;
    
    const matchStage = {
        'players.userId': new mongoose.Types.ObjectId(userId)
    };

    if (startDate && endDate) {
        matchStage.startedAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (difficulty) {
        matchStage['gameSettings.difficulty'] = difficulty;
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        { $unwind: '$players' },
        { $match: { 'players.userId': new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalGames: { $sum: 1 },
                totalWins: { $sum: { $cond: ['$players.isWinner', 1, 0] } },
                avgWpm: { $avg: '$players.finalWpm' },
                maxWpm: { $max: '$players.finalWpm' },
                avgAccuracy: { $avg: '$players.finalAccuracy' },
                totalCharacters: { $sum: '$players.totalCharacters' },
                totalCorrectCharacters: { $sum: '$players.correctCharacters' }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalGames: 0,
            totalWins: 0,
            winRate: 0,
            avgWpm: 0,
            maxWpm: 0,
            avgAccuracy: 0,
            totalCharacters: 0,
            totalCorrectCharacters: 0
        };
    }

    const result = stats[0];
    return {
        totalGames: result.totalGames,
        totalWins: result.totalWins,
        winRate: Math.round((result.totalWins / result.totalGames) * 100),
        avgWpm: Math.round(result.avgWpm * 10) / 10,
        maxWpm: result.maxWpm,
        avgAccuracy: Math.round(result.avgAccuracy * 10) / 10,
        totalCharacters: result.totalCharacters,
        totalCorrectCharacters: result.totalCorrectCharacters
    };
};

// 리더보드 데이터 조회
gameRecordSchema.statics.getLeaderboard = async function(options = {}) {
    const { period = 'all', difficulty, limit = 10 } = options;
    
    const matchStage = {};
    
    if (period !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }
        
        if (startDate) {
            matchStage.startedAt = { $gte: startDate };
        }
    }
    
    if (difficulty) {
        matchStage['gameSettings.difficulty'] = difficulty;
    }

    return await this.aggregate([
        { $match: matchStage },
        { $unwind: '$players' },
        {
            $group: {
                _id: '$players.userId',
                nickname: { $first: '$players.nickname' },
                bestWpm: { $max: '$players.finalWpm' },
                avgWpm: { $avg: '$players.finalWpm' },
                avgAccuracy: { $avg: '$players.finalAccuracy' },
                totalGames: { $sum: 1 },
                totalWins: { $sum: { $cond: ['$players.isWinner', 1, 0] } }
            }
        },
        {
            $addFields: {
                winRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$totalWins', '$totalGames'] }, 100] },
                        1
                    ]
                }
            }
        },
        { $sort: { bestWpm: -1 } },
        { $limit: limit }
    ]);
};

module.exports = mongoose.model('GameRecord', gameRecordSchema);