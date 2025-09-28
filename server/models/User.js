const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: [true, '닉네임은 필수입니다.'],
        unique: true,
        trim: true,
        minlength: [2, '닉네임은 최소 2자 이상이어야 합니다.'],
        maxlength: [20, '닉네임은 최대 20자까지 가능합니다.']
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // 게스트 사용자의 경우 null 허용
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '유효한 이메일 주소를 입력해주세요.']
    },
    password: {
        type: String,
        minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.']
    },
    isGuest: {
        type: Boolean,
        default: false
    },
    totalGames: {
        type: Number,
        default: 0,
        min: 0
    },
    wins: {
        type: Number,
        default: 0,
        min: 0
    },
    bestWpm: {
        type: Number,
        default: 0,
        min: 0
    },
    averageAccuracy: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    },
    experience: {
        type: Number,
        default: 0,
        min: 0
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 인덱스 설정
userSchema.index({ nickname: 1 });
userSchema.index({ email: 1 });
userSchema.index({ bestWpm: -1 });
userSchema.index({ level: -1, experience: -1 });

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 승률 계산 가상 속성
userSchema.virtual('winRate').get(function() {
    return this.totalGames > 0 ? Math.round((this.wins / this.totalGames) * 100) : 0;
});

// 다음 레벨까지 필요한 경험치 계산
userSchema.methods.getExpToNextLevel = function() {
    const expRequiredForNextLevel = this.level * 1000;
    return Math.max(0, expRequiredForNextLevel - this.experience);
};

// 경험치 추가 및 레벨업 처리
userSchema.methods.addExperience = function(exp) {
    this.experience += exp;
    
    const newLevel = Math.floor(this.experience / 1000) + 1;
    if (newLevel > this.level) {
        this.level = newLevel;
        return true; // 레벨업 발생
    }
    return false;
};

// 게임 통계 업데이트
userSchema.methods.updateGameStats = function(gameResult) {
    this.totalGames += 1;
    if (gameResult.isWinner) {
        this.wins += 1;
    }
    
    // 최고 WPM 업데이트
    if (gameResult.wpm > this.bestWpm) {
        this.bestWpm = gameResult.wpm;
    }
    
    // 평균 정확도 업데이트
    const totalAccuracy = (this.averageAccuracy * (this.totalGames - 1)) + gameResult.accuracy;
    this.averageAccuracy = Math.round(totalAccuracy / this.totalGames);
    
    // 경험치 계산 및 추가
    let expGained = 10; // 기본 경험치
    if (gameResult.isWinner) expGained += 50;
    if (gameResult.wpm > 60) expGained += 20;
    if (gameResult.accuracy > 95) expGained += 15;
    
    const leveledUp = this.addExperience(expGained);
    
    this.lastActiveAt = new Date();
    
    return { expGained, leveledUp };
};

// JSON 변환시 민감한 정보 제외
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);