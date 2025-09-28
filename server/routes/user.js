const express = require('express');
const { User, GameRecord } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const {
    validateNickname,
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 사용자 프로필 조회
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // 추가 통계 계산
        const additionalStats = {
            nextLevelExp: user.getExpToNextLevel(),
            winRate: user.winRate
        };

        res.json(createSuccessResponse({
            ...user.toJSON(),
            ...additionalStats
        }));

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json(createErrorResponse(
            '프로필 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 사용자 프로필 수정
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { nickname } = req.body;
        const user = req.user;

        // 게스트 사용자는 프로필 수정 불가
        if (user.isGuest) {
            return res.status(403).json(createErrorResponse(
                '게스트 사용자는 프로필을 수정할 수 없습니다.'
            ));
        }

        // 닉네임 변경
        if (nickname && nickname !== user.nickname) {
            if (!validateNickname(nickname)) {
                return res.status(400).json(createErrorResponse(
                    '닉네임은 2-20자의 한글, 영문, 숫자만 사용 가능합니다.'
                ));
            }

            // 중복 검사
            const existingUser = await User.findOne({ 
                nickname, 
                _id: { $ne: user._id } 
            });

            if (existingUser) {
                return res.status(409).json(createErrorResponse(
                    '이미 사용 중인 닉네임입니다.'
                ));
            }

            user.nickname = nickname;
        }

        await user.save();

        res.json(createSuccessResponse(
            user.toJSON(),
            '프로필이 업데이트되었습니다.'
        ));

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json(createErrorResponse(
            '프로필 업데이트 중 오류가 발생했습니다.'
        ));
    }
});

// 사용자 통계 조회
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { period, difficulty } = req.query;
        const userId = req.user._id;

        // 기본 통계
        const basicStats = {
            totalGames: req.user.totalGames,
            wins: req.user.wins,
            winRate: req.user.winRate,
            bestWpm: req.user.bestWpm,
            averageAccuracy: req.user.averageAccuracy,
            level: req.user.level,
            experience: req.user.experience,
            nextLevelExp: req.user.getExpToNextLevel()
        };

        // 상세 통계 (기간별, 난이도별)
        const options = {};
        if (period && period !== 'all') {
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

        const detailedStats = await GameRecord.getPlayerStats(userId, options);

        // 최근 게임 기록
        const recentGames = await GameRecord.find({
            'players.userId': userId
        })
        .sort({ startedAt: -1 })
        .limit(10)
        .populate('winner', 'nickname')
        .select('players gameSettings startedAt finishedAt duration winner');

        const formattedRecentGames = recentGames.map(game => {
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
                winner: game.winner.nickname
            };
        });

        res.json(createSuccessResponse({
            basic: basicStats,
            detailed: detailedStats,
            recentGames: formattedRecentGames
        }));

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json(createErrorResponse(
            '통계 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 사용자 게임 기록 조회
router.get('/games', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, difficulty } = req.query;
        const userId = req.user._id;

        const query = { 'players.userId': userId };
        if (difficulty) {
            query['gameSettings.difficulty'] = difficulty;
        }

        const games = await GameRecord.find(query)
            .sort({ startedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('winner', 'nickname')
            .select('players gameSettings startedAt finishedAt duration winner');

        const total = await GameRecord.countDocuments(query);

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
        console.error('Get games error:', error);
        res.status(500).json(createErrorResponse(
            '게임 기록 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 사용자 순위 조회
router.get('/ranking', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;

        // 전체 순위에서의 위치 계산
        const betterPlayers = await User.countDocuments({
            bestWpm: { $gt: req.user.bestWpm }
        });

        const totalPlayers = await User.countDocuments({
            isGuest: false,
            totalGames: { $gt: 0 }
        });

        const rank = betterPlayers + 1;
        const percentile = totalPlayers > 0 ? 
            Math.round(((totalPlayers - rank) / totalPlayers) * 100) : 0;

        res.json(createSuccessResponse({
            rank,
            totalPlayers,
            percentile,
            bestWpm: req.user.bestWpm
        }));

    } catch (error) {
        console.error('Get ranking error:', error);
        res.status(500).json(createErrorResponse(
            '순위 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 계정 삭제
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        // 게스트 사용자는 계정 삭제 불가
        if (user.isGuest) {
            return res.status(403).json(createErrorResponse(
                '게스트 사용자는 계정을 삭제할 수 없습니다.'
            ));
        }

        // 사용자 삭제 (게임 기록은 유지하되 개인정보는 익명화)
        user.nickname = `DeletedUser${user._id.toString().slice(-6)}`;
        user.email = null;
        user.password = null;
        await user.save();

        res.json(createSuccessResponse(null, '계정이 삭제되었습니다.'));

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json(createErrorResponse(
            '계정 삭제 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;