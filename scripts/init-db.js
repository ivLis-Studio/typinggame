const mongoose = require('mongoose');
const { Sentence } = require('../server/models');
const sentencesData = require('../data/sentences.json');
require('dotenv').config();

async function initializeDatabase() {
    try {
        // MongoDB 연결
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typinggame';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('MongoDB 연결 성공');

        // 기존 문장 데이터 삭제 (개발용)
        await Sentence.deleteMany({});
        console.log('기존 문장 데이터 삭제 완료');

        // 새 문장 데이터 삽입
        const sentences = sentencesData.map(sentence => ({
            ...sentence,
            characterCount: sentence.text.length,
            wordCount: sentence.text.trim().split(/\s+/).length,
            averageWpm: 0,
            usageCount: 0,
            isActive: true
        }));

        await Sentence.insertMany(sentences);
        console.log(`${sentences.length}개의 문장 데이터 삽입 완료`);

        // 통계 출력
        const stats = await Sentence.aggregate([
            {
                $group: {
                    _id: '$difficulty',
                    count: { $sum: 1 },
                    avgLength: { $avg: '$characterCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n문장 통계:');
        stats.forEach(stat => {
            console.log(`- ${stat._id}: ${stat.count}개 (평균 길이: ${Math.round(stat.avgLength)}자)`);
        });

        console.log('\n데이터베이스 초기화 완료!');
        
    } catch (error) {
        console.error('데이터베이스 초기화 실패:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('데이터베이스 연결 종료');
    }
}

// 스크립트 실행
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };