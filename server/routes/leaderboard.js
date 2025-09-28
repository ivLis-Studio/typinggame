const express = require('express');
const { GameRecord } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const {
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 전체 리더보드 조회
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            period = 'all', 
            difficulty, 
            limit = 50,
            type = 'wpm' // wpm, accuracy, games
        } = req.query;

        const options = {
            period,
            limit: parseInt(limit)
        };

        if (difficulty) {
            options.difficulty = difficulty;
        }

        let leaderboard;

        if (type === 'wpm') {
            leaderboard = await GameRecord.getLeaderboard(options);
        } else {
            // 다른 타입의 리더보드는 추후 구현
            leaderboard = await GameRecord.getLeaderboard(options);
        }

        // 현재 사용자의 순위 찾기
        let userRank = null;
        if (req.user) {
            const userIndex = leaderboard.findIndex(
                entry => entry._id.toString() === req.user._id.toString()
            );
            userRank = userIndex >= 0 ? userIndex + 1 : null;
        }

        res.json(createSuccessResponse({
            leaderboard,
            userRank,
            period,
            difficulty: difficulty || 'all',
            type,
            total: leaderboard.length
        }));

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json(createErrorResponse(
            '리더보드 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 주간/월간 리더보드
router.get('/weekly', optionalAuth, async (req, res) => {
    try {
        const { difficulty, limit = 20 } = req.query;

        const options = {
            period: 'weekly',
            limit: parseInt(limit)
        };

        if (difficulty) {
            options.difficulty = difficulty;
        }

        const leaderboard = await GameRecord.getLeaderboard(options);

        // 현재 사용자의 순위 찾기
        let userRank = null;
        if (req.user) {
            const userIndex = leaderboard.findIndex(
                entry => entry._id.toString() === req.user._id.toString()
            );
            userRank = userIndex >= 0 ? userIndex + 1 : null;
        }

        res.json(createSuccessResponse({
            leaderboard,
            userRank,
            period: 'weekly',
            difficulty: difficulty || 'all',
            total: leaderboard.length
        }));

    } catch (error) {
        console.error('Get weekly leaderboard error:', error);
        res.status(500).json(createErrorResponse(
            '주간 리더보드 조회 중 오류가 발생했습니다.'
        ));
    }
});

router.get('/monthly', optionalAuth, async (req, res) => {
    try {
        const { difficulty, limit = 30 } = req.query;

        const options = {
            period: 'monthly',
            limit: parseInt(limit)
        };

        if (difficulty) {
            options.difficulty = difficulty;
        }

        const leaderboard = await GameRecord.getLeaderboard(options);

        // 현재 사용자의 순위 찾기
        let userRank = null;
        if (req.user) {
            const userIndex = leaderboard.findIndex(
                entry => entry._id.toString() === req.user._id.toString()
            );
            userRank = userIndex >= 0 ? userIndex + 1 : null;
        }

        res.json(createSuccessResponse({
            leaderboard,
            userRank,
            period: 'monthly',
            difficulty: difficulty || 'all',
            total: leaderboard.length
        }));

    } catch (error) {
        console.error('Get monthly leaderboard error:', error);
        res.status(500).json(createErrorResponse(
            '월간 리더보드 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 난이도별 리더보드
router.get('/difficulty/:difficulty', optionalAuth, async (req, res) => {
    try {
        const { difficulty } = req.params;
        const { period = 'all', limit = 30 } = req.query;

        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json(createErrorResponse(
                '유효하지 않은 난이도입니다.'
            ));
        }

        const options = {
            period,
            difficulty,
            limit: parseInt(limit)
        };

        const leaderboard = await GameRecord.getLeaderboard(options);

        // 현재 사용자의 순위 찾기
        let userRank = null;
        if (req.user) {
            const userIndex = leaderboard.findIndex(
                entry => entry._id.toString() === req.user._id.toString()
            );
            userRank = userIndex >= 0 ? userIndex + 1 : null;
        }

        res.json(createSuccessResponse({
            leaderboard,
            userRank,
            period,
            difficulty,
            total: leaderboard.length
        }));

    } catch (error) {
        console.error('Get difficulty leaderboard error:', error);
        res.status(500).json(createErrorResponse(
            '난이도별 리더보드 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 리더보드 통계
router.get('/stats', async (req, res) => {
    try {
        const stats = await GameRecord.aggregate([
            {
                $unwind: '$players'
            },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    avgWpm: { $avg: '$players.finalWpm' },
                    maxWpm: { $max: '$players.finalWpm' },
                    avgAccuracy: { $avg: '$players.finalAccuracy' },
                    uniquePlayers: { $addToSet: '$players.userId' }
                }
            },
            {
                $project: {
                    totalGames: 1,
                    avgWpm: { $round: ['$avgWpm', 1] },
                    maxWpm: 1,
                    avgAccuracy: { $round: ['$avgAccuracy', 1] },
                    uniquePlayersCount: { $size: '$uniquePlayers' }
                }
            }
        ]);

        const result = stats[0] || {
            totalGames: 0,
            avgWpm: 0,
            maxWpm: 0,
            avgAccuracy: 0,
            uniquePlayersCount: 0
        };

        res.json(createSuccessResponse(result));

    } catch (error) {
        console.error('Get leaderboard stats error:', error);
        res.status(500).json(createErrorResponse(
            '리더보드 통계 조회 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;