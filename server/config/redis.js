const redis = require('redis');

let redisClient = null;

const connectRedis = async () => {
    try {
        const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
        
        redisClient = redis.createClient({
            url: redisURL,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    console.error('Redis 서버에 연결할 수 없습니다.');
                    return new Error('Redis 서버에 연결할 수 없습니다.');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    return new Error('재시도 시간이 초과되었습니다.');
                }
                if (options.attempt > 10) {
                    return new Error('재시도 횟수가 초과되었습니다.');
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        redisClient.on('error', (err) => {
            console.error('Redis 연결 오류:', err);
        });

        redisClient.on('connect', () => {
            console.log('Redis 연결 성공');
        });

        redisClient.on('reconnecting', () => {
            console.log('Redis 재연결 시도 중...');
        });

        redisClient.on('ready', () => {
            console.log('Redis 클라이언트 준비 완료');
        });

        await redisClient.connect();

        // 프로세스 종료시 연결 정리
        process.on('SIGINT', async () => {
            if (redisClient) {
                await redisClient.quit();
                console.log('Redis 연결을 종료합니다.');
            }
        });

    } catch (error) {
        console.error('Redis 연결 실패:', error.message);
        throw error;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis 클라이언트가 초기화되지 않았습니다.');
    }
    return redisClient;
};

module.exports = { 
    connectRedis, 
    getRedisClient 
};