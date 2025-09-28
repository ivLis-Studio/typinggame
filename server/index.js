const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const roomRoutes = require('./routes/room');
const gameRoutes = require('./routes/game');
const sentenceRoutes = require('./routes/sentence');
const leaderboardRoutes = require('./routes/leaderboard');
const gameSocketHandler = require('./controllers/gameSocketHandler');

class Server {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.port = process.env.PORT || 3000;
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeSocketHandlers();
        this.initializeDatabase();
    }

    initializeMiddleware() {
        // 보안 미들웨어
        this.app.use(helmet());
        
        // CORS 설정
        this.app.use(cors({
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15분
            max: 100, // 요청 제한
            message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // 정적 파일 서빙
        this.app.use(express.static('public'));
    }

    initializeRoutes() {
        // API 라우트
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/user', userRoutes);
        this.app.use('/api/room', roomRoutes);
        this.app.use('/api/game', gameRoutes);
        this.app.use('/api/sentences', sentenceRoutes);
        this.app.use('/api/leaderboard', leaderboardRoutes);

        // 기본 라우트
        this.app.get('/', (req, res) => {
            res.sendFile(__dirname + '/../public/index.html');
        });

        // 404 에러 핸들링
        this.app.use('*', (req, res) => {
            res.status(404).json({ 
                success: false, 
                message: '요청한 리소스를 찾을 수 없습니다.' 
            });
        });

        // 전역 에러 핸들링
        this.app.use((error, req, res, next) => {
            console.error('Server Error:', error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message || '서버 내부 오류가 발생했습니다.'
            });
        });
    }

    initializeSocketHandlers() {
        gameSocketHandler(this.io);
    }

    async initializeDatabase() {
        try {
            await connectDB();
            await connectRedis();
            console.log('데이터베이스 연결 완료');
        } catch (error) {
            console.error('데이터베이스 연결 실패:', error);
            process.exit(1);
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`서버가 포트 ${this.port}에서 실행 중입니다.`);
            console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
        });
    }
}

// 서버 인스턴스 생성 및 시작
const server = new Server();
server.start();

module.exports = server;