// 입력 데이터 검증 유틸리티
const validateRequired = (fields, data) => {
    const missing = [];
    
    fields.forEach(field => {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missing.push(field);
        }
    });
    
    if (missing.length > 0) {
        throw new Error(`필수 필드가 누락되었습니다: ${missing.join(', ')}`);
    }
};

// 이메일 유효성 검증
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// 닉네임 유효성 검증
const validateNickname = (nickname) => {
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
        return false;
    }
    
    // 특수문자 제한 (한글, 영문, 숫자만 허용)
    const nicknameRegex = /^[가-힣a-zA-Z0-9]+$/;
    return nicknameRegex.test(nickname);
};

// 비밀번호 유효성 검증
const validatePassword = (password) => {
    if (!password || password.length < 6) {
        return false;
    }
    return true;
};

// 방 이름 유효성 검증
const validateRoomName = (roomName) => {
    if (!roomName || roomName.trim().length < 1 || roomName.trim().length > 50) {
        return false;
    }
    return true;
};

// 문장 유효성 검증
const validateSentence = (text) => {
    if (!text || text.trim().length < 10 || text.trim().length > 200) {
        return false;
    }
    return true;
};

// 숫자 범위 검증
const validateRange = (value, min, max) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
};

// 게임 설정 검증
const validateGameSettings = (settings) => {
    const errors = [];
    
    if (!validateRange(settings.maxPlayers, 2, 8)) {
        errors.push('최대 플레이어 수는 2-8명 사이여야 합니다.');
    }
    
    if (!validateRange(settings.sentenceCount, 5, 50)) {
        errors.push('문장 개수는 5-50개 사이여야 합니다.');
    }
    
    if (!['easy', 'medium', 'hard'].includes(settings.difficulty)) {
        errors.push('난이도는 easy, medium, hard 중 하나여야 합니다.');
    }
    
    return errors;
};

// 에러 응답 생성
const createErrorResponse = (message, status = 400) => {
    return {
        success: false,
        message,
        status
    };
};

// 성공 응답 생성
const createSuccessResponse = (data = null, message = '성공') => {
    const response = {
        success: true,
        message
    };
    
    if (data !== null) {
        response.data = data;
    }
    
    return response;
};

module.exports = {
    validateRequired,
    validateEmail,
    validateNickname,
    validatePassword,
    validateRoomName,
    validateSentence,
    validateRange,
    validateGameSettings,
    createErrorResponse,
    createSuccessResponse
};