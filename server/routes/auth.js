const express = require('express');
const { User } = require('../models');
const { 
    generateToken, 
    createGuestUser, 
    authenticateToken,
    refreshToken 
} = require('../middleware/auth');
const {
    validateRequired,
    validateEmail,
    validateNickname,
    validatePassword,
    createErrorResponse,
    createSuccessResponse
} = require('../utils/validation');

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { nickname, email, password } = req.body;

        // 필수 필드 검증
        validateRequired(['nickname', 'email', 'password'], req.body);

        // 입력 데이터 검증
        if (!validateNickname(nickname)) {
            return res.status(400).json(createErrorResponse(
                '닉네임은 2-20자의 한글, 영문, 숫자만 사용 가능합니다.'
            ));
        }

        if (!validateEmail(email)) {
            return res.status(400).json(createErrorResponse(
                '유효한 이메일 주소를 입력해주세요.'
            ));
        }

        if (!validatePassword(password)) {
            return res.status(400).json(createErrorResponse(
                '비밀번호는 최소 6자 이상이어야 합니다.'
            ));
        }

        // 중복 검사
        const existingUser = await User.findOne({
            $or: [{ nickname }, { email }]
        });

        if (existingUser) {
            const field = existingUser.nickname === nickname ? '닉네임' : '이메일';
            return res.status(409).json(createErrorResponse(
                `이미 사용 중인 ${field}입니다.`
            ));
        }

        // 사용자 생성
        const user = new User({
            nickname,
            email,
            password
        });

        await user.save();

        // JWT 토큰 생성
        const accessToken = generateToken(
            { userId: user._id, nickname: user.nickname },
            { expiresIn: '1h' }
        );

        const refreshTokenValue = generateToken(
            { userId: user._id, nickname: user.nickname },
            { expiresIn: '7d' }
        );

        res.status(201).json(createSuccessResponse({
            user: user.toJSON(),
            accessToken,
            refreshToken: refreshTokenValue
        }, '회원가입이 완료되었습니다.'));

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json(createErrorResponse(
            '회원가입 중 오류가 발생했습니다.'
        ));
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 필수 필드 검증
        validateRequired(['email', 'password'], req.body);

        // 사용자 조회
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json(createErrorResponse(
                '이메일 또는 비밀번호가 올바르지 않습니다.'
            ));
        }

        // 게스트 사용자는 로그인 불가
        if (user.isGuest) {
            return res.status(401).json(createErrorResponse(
                '게스트 사용자는 로그인할 수 없습니다.'
            ));
        }

        // 비밀번호 검증
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json(createErrorResponse(
                '이메일 또는 비밀번호가 올바르지 않습니다.'
            ));
        }

        // 마지막 활동 시간 업데이트
        user.lastActiveAt = new Date();
        await user.save();

        // JWT 토큰 생성
        const accessToken = generateToken(
            { userId: user._id, nickname: user.nickname },
            { expiresIn: '1h' }
        );

        const refreshTokenValue = generateToken(
            { userId: user._id, nickname: user.nickname },
            { expiresIn: '7d' }
        );

        res.json(createSuccessResponse({
            user: user.toJSON(),
            accessToken,
            refreshToken: refreshTokenValue
        }, '로그인이 완료되었습니다.'));

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(createErrorResponse(
            '로그인 중 오류가 발생했습니다.'
        ));
    }
});

// 게스트 로그인
router.post('/guest', async (req, res) => {
    try {
        const guestUser = await createGuestUser();

        // JWT 토큰 생성 (게스트는 짧은 만료 시간)
        const accessToken = generateToken(
            { userId: guestUser._id, nickname: guestUser.nickname },
            { expiresIn: '24h' }
        );

        res.json(createSuccessResponse({
            user: guestUser.toJSON(),
            accessToken
        }, '게스트 로그인이 완료되었습니다.'));

    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json(createErrorResponse(
            '게스트 로그인 중 오류가 발생했습니다.'
        ));
    }
});

// 토큰 새로고침
router.post('/refresh', refreshToken);

// 로그아웃 (클라이언트에서 토큰 삭제)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // 마지막 활동 시간 업데이트
        req.user.lastActiveAt = new Date();
        await req.user.save();

        res.json(createSuccessResponse(null, '로그아웃이 완료되었습니다.'));
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json(createErrorResponse(
            '로그아웃 중 오류가 발생했습니다.'
        ));
    }
});

// 현재 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json(createSuccessResponse({
            user: req.user.toJSON()
        }));
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json(createErrorResponse(
            '사용자 정보 조회 중 오류가 발생했습니다.'
        ));
    }
});

// 닉네임 중복 확인
router.get('/check-nickname/:nickname', async (req, res) => {
    try {
        const { nickname } = req.params;

        if (!validateNickname(nickname)) {
            return res.status(400).json(createErrorResponse(
                '유효하지 않은 닉네임입니다.'
            ));
        }

        const existingUser = await User.findOne({ nickname });
        const isAvailable = !existingUser;

        res.json(createSuccessResponse({
            nickname,
            isAvailable
        }));

    } catch (error) {
        console.error('Check nickname error:', error);
        res.status(500).json(createErrorResponse(
            '닉네임 확인 중 오류가 발생했습니다.'
        ));
    }
});

// 이메일 중복 확인
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        if (!validateEmail(email)) {
            return res.status(400).json(createErrorResponse(
                '유효하지 않은 이메일입니다.'
            ));
        }

        const existingUser = await User.findOne({ email });
        const isAvailable = !existingUser;

        res.json(createSuccessResponse({
            email,
            isAvailable
        }));

    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json(createErrorResponse(
            '이메일 확인 중 오류가 발생했습니다.'
        ));
    }
});

module.exports = router;