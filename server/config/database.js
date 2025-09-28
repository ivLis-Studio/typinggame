const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/typinggame';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('MongoDB 연결 성공');

        // 연결 이벤트 처리
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB 연결 오류:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB 연결이 끊어졌습니다.');
        });

        // 프로세스 종료시 연결 정리
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB 연결을 종료합니다.');
            process.exit(0);
        });

    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        throw error;
    }
};

module.exports = { connectDB };