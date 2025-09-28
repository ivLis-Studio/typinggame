const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    // 인메모리 MongoDB 서버 시작
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

afterAll(async () => {
    // 연결 종료 및 서버 정리
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

afterEach(async () => {
    // 각 테스트 후 컬렉션 정리
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// 테스트용 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/typinggame-test';