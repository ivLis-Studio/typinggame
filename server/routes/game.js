const express = require('express');
const { GameRecord } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 게임 기록 조회
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user._id;

        const games = await GameRecord.find({
            'players.userId': userId
        })
        .sort({ startedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('winner', 'nickname')
        .select('players gameSettings startedAt finishedAt duration winner');

        const total = await GameRecord.countDocuments({
            'players.userId': userId
        });

        const formattedGames = games.map(game => {
            const playerData = game.players.find(p => p.userId.toString() === userId.toString());
            return {
                gameId: game._id,
                wpm: playerData.finalWpm,
                accuracy: playerData.finalAccuracy,
                rank: playerData.rank,
                isWinner: playerData.isWinner,
                difficulty: game.gameSettings.difficulty,
                duration: game.duration,
                playedAt: game.startedAt,
                winner: game.winner.nickname,
                totalPlayers: game.players.length
            };
        });

        res.json(createSuccessResponse({
            games: formattedGames,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                totalItems: total
            }
        }));

    } catch (error) {
        console.error('Get game history error:', error);
        res.status(500).json(createErrorResponse(
            '게임 기록 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 특정 게임 상세 정보 조회
router.get('/:gameId', optionalAuth, async (req, res) => {
    try {
        const { gameId } = req.params;

        const game = await GameRecord.findById(gameId)
            .populate('players.userId', 'nickname level')
            .populate('winner', 'nickname');

        if (!game) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임입니다.'
            ));
        }

        // 플레이어가 참가한 게임인지 확인
        const isParticipant = req.user && 
            game.players.some(p => p.userId._id.toString() === req.user._id.toString());

        // 참가자가 아닌 경우 키스트로크 정보 제외
        const gameData = game.toJSON();
        if (!isParticipant) {
            gameData.players.forEach(player => {
                delete player.keystrokes;
            });
        }

        res.json(createSuccessResponse(gameData));

    } catch (error) {
        console.error('Get game detail error:', error);
        res.status(500).json(createErrorResponse(
            '게임 상세 정보 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 게임 통계 조회
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const { period = 'all', difficulty } = req.query;
        const userId = req.user._id;

        const options = {};
        
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
                options.startDate = startDate;
                options.endDate = now;
            }
        }

        if (difficulty) {
            options.difficulty = difficulty;
        }

        const stats = await GameRecord.getPlayerStats(userId, options);

        res.json(createSuccessResponse(stats));

    } catch (error) {
        console.error('Get game stats error:', error);
        res.status(500).json(createErrorResponse(
            '게임 통계 조회 중 오류가 발생했습니다.'
        ));
    }
});

// WPM 진행률 차트 데이터
router.get('/stats/wpm-progress', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const userId = req.user._id;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const games = await GameRecord.find({
            'players.userId': userId,
            startedAt: { $gte: startDate }
        })
        .sort({ startedAt: 1 })
        .select('players startedAt');

        const progressData = games.map(game => {
            const playerData = game.players.find(p => p.userId.toString() === userId.toString());
            return {
                date: game.startedAt.toISOString().split('T')[0],
                wpm: playerData.finalWpm,
                accuracy: playerData.finalAccuracy
            };
        });

        // 날짜별 최고 WPM 집계
        const dailyBest = {};
        progressData.forEach(data => {
            if (!dailyBest[data.date] || dailyBest[data.date].wpm < data.wpm) {
                dailyBest[data.date] = data;
            }
        });

        const chartData = Object.values(dailyBest).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        res.json(createSuccessResponse(chartData));

    } catch (error) {
        console.error('Get WPM progress error:', error);
        res.status(500).json(createErrorResponse(
            'WPM 진행률 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 난이도별 성과 통계
router.get('/stats/difficulty-performance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;

        const difficulties = ['easy', 'medium', 'hard'];
        const performanceData = {};

        for (const difficulty of difficulties) {
            const stats = await GameRecord.getPlayerStats(userId, { difficulty });
            performanceData[difficulty] = stats;
        }

        res.json(createSuccessResponse(performanceData));

    } catch (error) {
        console.error('Get difficulty performance error:', error);
        res.status(500).json(createErrorResponse(
            '난이도별 성과 조회 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;