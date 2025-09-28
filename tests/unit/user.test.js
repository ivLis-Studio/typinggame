const { User } = require('../../server/models');

describe('User Model', () => {
    describe('사용자 생성', () => {
        test('유효한 데이터로 사용자를 생성할 수 있다', async () => {
            const userData = {
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            };

            const user = new User(userData);
            await user.save();

            expect(user._id).toBeDefined();
            expect(user.nickname).toBe(userData.nickname);
            expect(user.email).toBe(userData.email);
            expect(user.password).not.toBe(userData.password); // 해싱되어야 함
            expect(user.isGuest).toBe(false);
            expect(user.totalGames).toBe(0);
            expect(user.wins).toBe(0);
            expect(user.level).toBe(1);
        });

        test('게스트 사용자를 생성할 수 있다', async () => {
            const userData = {
                nickname: 'Guest123',
                isGuest: true
            };

            const user = new User(userData);
            await user.save();

            expect(user.isGuest).toBe(true);
            expect(user.email).toBeUndefined();
            expect(user.password).toBeUndefined();
        });

        test('필수 필드가 없으면 에러가 발생한다', async () => {
            const user = new User({});

            await expect(user.save()).rejects.toThrow();
        });

        test('중복된 닉네임으로 사용자 생성시 에러가 발생한다', async () => {
            const userData = {
                nickname: '중복닉네임',
                email: 'test1@example.com',
                password: 'password123'
            };

            await new User(userData).save();

            const duplicateUser = new User({
                nickname: '중복닉네임',
                email: 'test2@example.com',
                password: 'password456'
            });

            await expect(duplicateUser.save()).rejects.toThrow();
        });
    });

    describe('비밀번호 검증', () => {
        test('올바른 비밀번호로 검증할 수 있다', async () => {
            const password = 'password123';
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password
            });
            await user.save();

            const isValid = await user.comparePassword(password);
            expect(isValid).toBe(true);
        });

        test('잘못된 비밀번호로 검증하면 false를 반환한다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            });
            await user.save();

            const isValid = await user.comparePassword('wrongpassword');
            expect(isValid).toBe(false);
        });
    });

    describe('게임 통계 업데이트', () => {
        test('게임 결과로 통계를 업데이트할 수 있다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            });
            await user.save();

            const gameResult = {
                wpm: 80,
                accuracy: 95,
                isWinner: true
            };

            const result = user.updateGameStats(gameResult);

            expect(user.totalGames).toBe(1);
            expect(user.wins).toBe(1);
            expect(user.bestWpm).toBe(80);
            expect(user.averageAccuracy).toBe(95);
            expect(result.expGained).toBeGreaterThan(0);
        });

        test('레벨업이 발생할 수 있다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123',
                experience: 950 // 레벨업에 가까운 경험치
            });
            await user.save();

            const gameResult = {
                wmp: 100,
                accuracy: 98,
                isWinner: true
            };

            const result = user.updateGameStats(gameResult);

            expect(result.leveledUp).toBe(true);
            expect(user.level).toBe(2);
        });
    });

    describe('가상 속성', () => {
        test('승률을 계산할 수 있다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123',
                totalGames: 10,
                wins: 7
            });

            expect(user.winRate).toBe(70);
        });

        test('게임이 없으면 승률이 0이다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            });

            expect(user.winRate).toBe(0);
        });
    });

    describe('JSON 변환', () => {
        test('JSON 변환시 비밀번호가 제외된다', async () => {
            const user = new User({
                nickname: '테스트유저',
                email: 'test@example.com',
                password: 'password123'
            });
            await user.save();

            const json = user.toJSON();
            expect(json.password).toBeUndefined();
            expect(json.nickname).toBe('테스트유저');
        });
    });
});