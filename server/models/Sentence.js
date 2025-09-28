const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, '문장 내용은 필수입니다.'],
        trim: true,
        minlength: [10, '문장은 최소 10자 이상이어야 합니다.'],
        maxlength: [200, '문장은 최대 200자까지 가능합니다.']
    },
    difficulty: {
        type: String,
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: '난이도는 easy, medium, hard 중 하나여야 합니다.'
        },
        required: [true, '난이도는 필수입니다.']
    },
    language: {
        type: String,
        enum: {
            values: ['ko', 'en'],
            message: '언어는 ko(한국어) 또는 en(영어)만 지원합니다.'
        },
        default: 'ko'
    },
    category: {
        type: String,
        enum: {
            values: ['general', 'tech', 'literature', 'news', 'quote', 'tongue_twister'],
            message: '카테고리가 올바르지 않습니다.'
        },
        default: 'general'
    },
    averageWpm: {
        type: Number,
        default: 0,
        min: 0
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    characterCount: {
        type: Number,
        required: true
    },
    wordCount: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// 인덱스 설정
sentenceSchema.index({ difficulty: 1, language: 1 });
sentenceSchema.index({ category: 1 });
sentenceSchema.index({ averageWpm: -1 });
sentenceSchema.index({ usageCount: -1 });
sentenceSchema.index({ isActive: 1 });

// 문장 저장 전 문자/단어 수 계산
sentenceSchema.pre('save', function(next) {
    if (this.isModified('text')) {
        this.characterCount = this.text.length;
        this.wordCount = this.text.trim().split(/\s+/).length;
    }
    next();
});

// 사용 횟수 증가
sentenceSchema.methods.incrementUsage = function() {
    this.usageCount += 1;
    return this.save();
};

// 평균 WPM 업데이트
sentenceSchema.methods.updateAverageWpm = function(newWpm) {
    if (this.usageCount === 0) {
        this.averageWpm = newWpm;
    } else {
        // 이동 평균 계산
        this.averageWpm = Math.round(
            ((this.averageWpm * (this.usageCount - 1)) + newWpm) / this.usageCount
        );
    }
    return this;
};

// 난이도별 문장 조회
sentenceSchema.statics.getByDifficulty = async function(difficulty, options = {}) {
    const { 
        limit = 10, 
        language = 'ko', 
        category,
        exclude = [],
        random = false 
    } = options;

    const query = {
        difficulty,
        language,
        isActive: true
    };

    if (category) {
        query.category = category;
    }

    if (exclude.length > 0) {
        query._id = { $nin: exclude };
    }

    let sentences;
    
    if (random) {
        sentences = await this.aggregate([
            { $match: query },
            { $sample: { size: limit } }
        ]);
    } else {
        sentences = await this.find(query)
            .sort({ usageCount: 1, averageWpm: 1 }) // 덜 사용되고 쉬운 문장 우선
            .limit(limit);
    }

    return sentences;
};

// 랜덤 문장 조회
sentenceSchema.statics.getRandomSentences = async function(count = 1, options = {}) {
    const { difficulty, language = 'ko', category } = options;
    
    const matchStage = {
        isActive: true,
        language
    };

    if (difficulty) {
        matchStage.difficulty = difficulty;
    }

    if (category) {
        matchStage.category = category;
    }

    return await this.aggregate([
        { $match: matchStage },
        { $sample: { size: count } }
    ]);
};

// 문장 검색
sentenceSchema.statics.searchSentences = async function(searchTerm, options = {}) {
    const { difficulty, language = 'ko', limit = 20 } = options;
    
    const query = {
        isActive: true,
        language,
        $text: { $search: searchTerm }
    };

    if (difficulty) {
        query.difficulty = difficulty;
    }

    return await this.find(query)
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit);
};

// 텍스트 검색을 위한 인덱스 추가
sentenceSchema.index({ 
    text: 'text',
    tags: 'text'
}, {
    weights: {
        text: 10,
        tags: 5
    }
});

module.exports = mongoose.model('Sentence', sentenceSchema);