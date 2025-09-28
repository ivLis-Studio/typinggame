const request = require('supertest');
const express = require('express');
const authRoutes = require('../../server/routes/auth');
const { User } = require('../../server/models');

// Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
    describe('POST /api/auth/register', () => {
        test('유효한 데이터로 회원가입할 수 있다', async () => {
            const userData = {
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.nickname).toBe(userData.nickname);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();

            // 데이터베이스에 저장되었는지 확인
            const savedUser = await User.findOne({ email: userData.email });
            expect(savedUser).toBeTruthy();
        });

        test('중복된 닉네임으로 회원가입시 409 에러가 발생한다', async () => {
            // 먼저 사용자 생성
            await new User({
                nickname: '중복닉네임',
                email: 'first@example.com',
                password: 'password123'
            }).save();

            const userData = {
                nickname: '중복닉네임',
                email: 'second@example.com',
                password: 'password456'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('닉네임');
        });

        test('필수 필드가 없으면 400 에러가 발생한다', async () => {
            const userData = {
                nickname: '테스트유저'
                // email, password 누락
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // 테스트 사용자 생성
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            });
            await user.save();
        });

        test('올바른 이메일과 비밀번호로 로그인할 수 있다', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(credentials)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(credentials.email);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();
        });

        test('잘못된 이메일로 로그인시 401 에러가 발생한다', async () => {
            const credentials = {
                email: 'wrong@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(credentials)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        test('잘못된 비밀번호로 로그인시 401 에러가 발생한다', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(credentials)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/guest', () => {
        test('게스트 사용자를 생성할 수 있다', async () => {
            const response = await request(app)
                .post('/api/auth/guest')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.isGuest).toBe(true);
            expect(response.body.data.user.nickname).toMatch(/^Guest\d+$/);
            expect(response.body.data.accessToken).toBeDefined();

            // 데이터베이스에 저장되었는지 확인
            const savedUser = await User.findById(response.body.data.user._id);
            expect(savedUser.isGuest).toBe(true);
        });
    });

    describe('GET /api/auth/check-nickname/:nickname', () => {
        test('사용 가능한 닉네임을 확인할 수 있다', async () => {
            const response = await request(app)
                .get('/api/auth/check-nickname/사용가능닉네임')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isAvailable).toBe(true);
        });

        test('이미 사용 중인 닉네임을 확인할 수 있다', async () => {
            // 사용자 생성
            await new User({
                nickname: '사용중닉네임',
                email: 'test@example.com',
                password: 'password123'
            }).save();

            const response = await request(app)
                .get('/api/auth/check-nickname/사용중닉네임')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isAvailable).toBe(false);
        });
    });
});