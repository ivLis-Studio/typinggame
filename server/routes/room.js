const express = require('express');
const { Room, Sentence } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const {
    validateRequired,
    validateRoomName,
    validateGameSettings,
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 게임방 생성
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { roomName, maxPlayers, difficulty, sentenceCount, isPrivate } = req.body;

        // 필수 필드 검증
        validateRequired(['roomName'], req.body);

        // 방 이름 검증
        if (!validateRoomName(roomName)) {
            return res.status(400).json(createErrorResponse(
                '방 이름은 1-50자 사이여야 합니다.'
            ));
        }

        // 게임 설정 검증
        const gameSettings = {
            maxPlayers: maxPlayers || 4,
            sentenceCount: sentenceCount || 10,
            difficulty: difficulty || 'medium'
        };

        const validationErrors = validateGameSettings(gameSettings);
        if (validationErrors.length > 0) {
            return res.status(400).json(createErrorResponse(
                validationErrors.join(' ')
            ));
        }

        // 방 생성
        const room = new Room({
            roomName: roomName.trim(),
            hostId: req.user._id,
            maxPlayers: gameSettings.maxPlayers,
            difficulty: gameSettings.difficulty,
            sentenceCount: gameSettings.sentenceCount,
            isPrivate: isPrivate || false
        });

        // 방장 자동 입장
        room.addPlayer(req.user);

        // 비공개 방인 경우 방 코드 생성
        if (isPrivate) {
            room.generateRoomCode();
        }

        await room.save();

        res.status(201).json(createSuccessResponse(
            room.toJSON(),
            '게임방이 생성되었습니다.'
        ));

    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json(createErrorResponse(
            '게임방 생성 중 오류가 발생했습니다.'
        ));
    }
});

// 게임방 목록 조회 (공개방만)
router.get('/list', async (req, res) => {
    try {
        const { page = 1, limit = 10, difficulty, status } = req.query;

        const query = { 
            isPrivate: false,
            gameStatus: { $in: ['waiting', 'ready'] }
        };

        if (difficulty) {
            query.difficulty = difficulty;
        }

        if (status) {
            query.gameStatus = status;
        }

        const rooms = await Room.find(query)
            .populate('hostId', 'nickname level')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Room.countDocuments(query);

        const formattedRooms = rooms.map(room => ({
            ...room.getSummary(),
            host: room.hostId
        }));

        res.json(createSuccessResponse({
            rooms: formattedRooms,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                totalItems: total
            }
        }));

    } catch (error) {
        console.error('Get room list error:', error);
        res.status(500).json(createErrorResponse(
            '게임방 목록 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 게임방 정보 조회
router.get('/:roomId', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId)
            .populate('hostId', 'nickname level')
            .populate('players.userId', 'nickname level');

        if (!room) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임방입니다.'
            ));
        }

        res.json(createSuccessResponse(room.toJSON()));

    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json(createErrorResponse(
            '게임방 정보 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 게임방 참가
router.post('/:roomId/join', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임방입니다.'
            ));
        }

        // 게임 상태 확인
        if (room.gameStatus === 'playing') {
            return res.status(400).json(createErrorResponse(
                '진행 중인 게임에는 참가할 수 없습니다.'
            ));
        }

        if (room.gameStatus === 'finished') {
            return res.status(400).json(createErrorResponse(
                '종료된 게임입니다.'
            ));
        }

        // 플레이어 추가
        room.addPlayer(req.user);
        await room.save();

        // 업데이트된 방 정보 반환
        const updatedRoom = await Room.findById(roomId)
            .populate('hostId', 'nickname level')
            .populate('players.userId', 'nickname level');

        res.json(createSuccessResponse(
            updatedRoom.toJSON(),
            '게임방에 참가했습니다.'
        ));

    } catch (error) {
        console.error('Join room error:', error);
        
        if (error.message.includes('이미 참가한') || 
            error.message.includes('가득 찼습니다') ||
            error.message.includes('진행 중입니다')) {
            return res.status(400).json(createErrorResponse(error.message));
        }

        res.status(500).json(createErrorResponse(
            '게임방 참가 중 오류가 발생했습니다.'
        ));
    }
});

// 게임방 나가기
router.post('/:roomId/leave', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임방입니다.'
            ));
        }

        // 플레이어 제거
        room.removePlayer(req.user._id);

        // 방에 아무도 없으면 삭제
        if (room.players.length === 0) {
            await Room.findByIdAndDelete(roomId);
            return res.json(createSuccessResponse(
                null,
                '게임방을 나왔습니다.'
            ));
        }

        await room.save();

        res.json(createSuccessResponse(
            null,
            '게임방을 나왔습니다.'
        ));

    } catch (error) {
        console.error('Leave room error:', error);
        
        if (error.message.includes('참가하지 않은')) {
            return res.status(400).json(createErrorResponse(error.message));
        }

        res.status(500).json(createErrorResponse(
            '게임방 나가기 중 오류가 발생했습니다.'
        ));
    }
});

// 준비 상태 토글
router.post('/:roomId/ready', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임방입니다.'
            ));
        }

        // 게임 상태 확인
        if (room.gameStatus !== 'waiting') {
            return res.status(400).json(createErrorResponse(
                '대기 중인 상태에서만 준비할 수 있습니다.'
            ));
        }

        // 준비 상태 토글
        room.togglePlayerReady(req.user._id);
        await room.save();

        // 업데이트된 방 정보 반환
        const updatedRoom = await Room.findById(roomId)
            .populate('hostId', 'nickname level')
            .populate('players.userId', 'nickname level');

        res.json(createSuccessResponse(
            updatedRoom.toJSON(),
            '준비 상태가 변경되었습니다.'
        ));

    } catch (error) {
        console.error('Toggle ready error:', error);
        
        if (error.message.includes('참가하지 않은')) {
            return res.status(400).json(createErrorResponse(error.message));
        }

        res.status(500).json(createErrorResponse(
            '준비 상태 변경 중 오류가 발생했습니다.'
        ));
    }
});

// 게임 시작 (방장만 가능)
router.post('/:roomId/start', authenticateToken, async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createErrorResponse(
                '존재하지 않는 게임방입니다.'
            ));
        }

        // 방장 권한 확인
        if (room.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json(createErrorResponse(
                '방장만 게임을 시작할 수 있습니다.'
            ));
        }

        // 게임 시작 가능 여부 확인
        if (!room.canStartGame()) {
            return res.status(400).json(createErrorResponse(
                '게임을 시작할 수 없습니다. 모든 플레이어가 준비되었는지 확인해주세요.'
            ));
        }

        // 문장 선택
        const sentences = await Sentence.getByDifficulty(room.difficulty, {
            limit: room.sentenceCount,
            random: true
        });

        if (sentences.length < room.sentenceCount) {
            return res.status(400).json(createErrorResponse(
                '충분한 문장이 없습니다.'
            ));
        }

        // 방 상태 업데이트
        room.gameStatus = 'playing';
        room.sentences = sentences.map((sentence, index) => ({
            text: sentence.text,
            difficulty: sentence.difficulty,
            index
        }));

        await room.save();

        res.json(createSuccessResponse(
            room.toJSON(),
            '게임이 시작되었습니다.'
        ));

    } catch (error) {
        console.error('Start game error:', error);
        res.status(500).json(createErrorResponse(
            '게임 시작 중 오류가 발생했습니다.'
        ));
    }
});

// 방 코드로 참가
router.post('/join-by-code', authenticateToken, async (req, res) => {
    try {
        const { roomCode } = req.body;

        validateRequired(['roomCode'], req.body);

        const room = await Room.findOne({ roomCode })
            .populate('hostId', 'nickname level')
            .populate('players.userId', 'nickname level');

        if (!room) {
            return res.status(404).json(createErrorResponse(
                '유효하지 않은 방 코드입니다.'
            ));
        }

        // 게임 상태 확인
        if (room.gameStatus === 'playing') {
            return res.status(400).json(createErrorResponse(
                '진행 중인 게임에는 참가할 수 없습니다.'
            ));
        }

        // 플레이어 추가
        room.addPlayer(req.user);
        await room.save();

        // 업데이트된 방 정보 반환
        const updatedRoom = await Room.findOne({ roomCode })
            .populate('hostId', 'nickname level')
            .populate('players.userId', 'nickname level');

        res.json(createSuccessResponse(
            updatedRoom.toJSON(),
            '게임방에 참가했습니다.'
        ));

    } catch (error) {
        console.error('Join by code error:', error);
        
        if (error.message.includes('이미 참가한') || 
            error.message.includes('가득 찼습니다')) {
            return res.status(400).json(createErrorResponse(error.message));
        }

        res.status(500).json(createErrorResponse(
            '방 코드로 참가 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;