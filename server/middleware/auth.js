const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT 토큰 생성
const generateToken = (payload, options = {}) => {
    const defaultOptions = {
        expiresIn: '7d', // 7일 만료
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, { ...defaultOptions, ...options });
};

// JWT 토큰 검증
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('유효하지 않은 토큰입니다.');
    }
};

// 인증 미들웨어
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '접근 토큰이 필요합니다.'
            });
        }

        const decoded = verifyToken(token);
        
        // 사용자 정보 조회
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 마지막 활동 시간 업데이트
        user.lastActiveAt = new Date();
        await user.save();

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({
            success: false,
            message: '토큰 검증에 실패했습니다.'
        });
    }
};

// 선택적 인증 미들웨어 (게스트 허용)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId);
            if (user) {
                user.lastActiveAt = new Date();
                await user.save();
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // 토큰이 유효하지 않아도 계속 진행
        next();
    }
};

// 게스트 사용자 생성
const createGuestUser = async () => {
    const guestNumber = Math.floor(Math.random() * 10000);
    const nickname = `Guest${guestNumber}`;
    
    // 중복 닉네임 체크
    let existingUser = await User.findOne({ nickname });
    while (existingUser) {
        const newGuestNumber = Math.floor(Math.random() * 10000);
        const newNickname = `Guest${newGuestNumber}`;
        existingUser = await User.findOne({ nickname: newNickname });
        if (!existingUser) {
            nickname = newNickname;
            break;
        }
    }

    const guestUser = new User({
        nickname,
        isGuest: true
    });

    await guestUser.save();
    return guestUser;
};

// 토큰 새로고침
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: '리프레시 토큰이 필요합니다.'
            });
        }

        const decoded = verifyToken(refreshToken);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 새 액세스 토큰 생성
        const newAccessToken = generateToken(
            { userId: user._id, nickname: user.nickname },
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(403).json({
            success: false,
            message: '토큰 새로고침에 실패했습니다.'
        });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth,
    createGuestUser,
    refreshToken
};