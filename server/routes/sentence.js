const express = require('express');
const { Sentence } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const {
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 난이도별 문장 조회
router.get('/:difficulty', optionalAuth, async (req, res) => {
    try {
        const { difficulty } = req.params;
        const { limit = 10, category, language = 'ko' } = req.query;

        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json(createErrorResponse(
                '유효하지 않은 난이도입니다.'
            ));
        }

        const options = {
            limit: parseInt(limit),
            language,
            random: true
        };

        if (category) {
            options.category = category;
        }

        const sentences = await Sentence.getByDifficulty(difficulty, options);

        res.json(createSuccessResponse({
            sentences,
            difficulty,
            language,
            category: category || 'all'
        }));

    } catch (error) {
        console.error('Get sentences by difficulty error:', error);
        res.status(500).json(createErrorResponse(
            '문장 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 랜덤 문장 조회
router.get('/random', optionalAuth, async (req, res) => {
    try {
        const { 
            count = 1, 
            difficulty, 
            language = 'ko', 
            category 
        } = req.query;

        const options = { language };
        
        if (difficulty) {
            options.difficulty = difficulty;
        }
        
        if (category) {
            options.category = category;
        }

        const sentences = await Sentence.getRandomSentences(parseInt(count), options);

        res.json(createSuccessResponse({
            sentences,
            count: sentences.length,
            language,
            difficulty: difficulty || 'all',
            category: category || 'all'
        }));

    } catch (error) {
        console.error('Get random sentences error:', error);
        res.status(500).json(createErrorResponse(
            '랜덤 문장 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 문장 검색
router.get('/search', optionalAuth, async (req, res) => {
    try {
        const { 
            q: searchTerm, 
            difficulty, 
            language = 'ko', 
            limit = 20 
        } = req.query;

        if (!searchTerm) {
            return res.status(400).json(createErrorResponse(
                '검색어를 입력해주세요.'
            ));
        }

        const options = {
            limit: parseInt(limit),
            language
        };

        if (difficulty) {
            options.difficulty = difficulty;
        }

        const sentences = await Sentence.searchSentences(searchTerm, options);

        res.json(createSuccessResponse({
            sentences,
            searchTerm,
            difficulty: difficulty || 'all',
            language,
            count: sentences.length
        }));

    } catch (error) {
        console.error('Search sentences error:', error);
        res.status(500).json(createErrorResponse(
            '문장 검색 중 오류가 발생했습니다.'
        ));
    }
});

// 카테고리 목록 조회
router.get('/categories', async (req, res) => {
    try {
        const categories = [
            { value: 'general', name: '일반', description: '일상적인 문장들' },
            { value: 'tech', name: '기술', description: '프로그래밍 및 기술 관련' },
            { value: 'literature', name: '문학', description: '문학 작품 및 명언' },
            { value: 'news', name: '뉴스', description: '시사 및 뉴스 문장' },
            { value: 'quote', name: '명언', description: '유명한 명언들' },
            { value: 'tongue_twister', name: '잰말놀이', description: '빠르게 말하기 어려운 문장들' }
        ];

        res.json(createSuccessResponse(categories));

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json(createErrorResponse(
            '카테고리 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 문장 통계 조회
router.get('/stats/overview', async (req, res) => {
    try {
        const { language = 'ko' } = req.query;

        const stats = await Sentence.aggregate([
            { $match: { isActive: true, language } },
            {
                $group: {
                    _id: '$difficulty',
                    count: { $sum: 1 },
                    avgLength: { $avg: '$characterCount' },
                    avgUsage: { $avg: '$usageCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categoryStats = await Sentence.aggregate([
            { $match: { isActive: true, language } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalCount = await Sentence.countDocuments({ 
            isActive: true, 
            language 
        });

        res.json(createSuccessResponse({
            total: totalCount,
            byDifficulty: stats,
            byCategory: categoryStats,
            language
        }));

    } catch (error) {
        console.error('Get sentence stats error:', error);
        res.status(500).json(createErrorResponse(
            '문장 통계 조회 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;