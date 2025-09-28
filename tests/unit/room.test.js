const { Room, User } = require('../../server/models');

describe('Room Model', () => {
    let hostUser;

    beforeEach(async () => {
        // 테스트용 방장 사용자 생성
        hostUser = new User({
            nickname: '방장',
            email: 'host@example.com',
            password: 'password123'
        });
        await hostUser.save();
    });

    describe('방 생성', () => {
        test('유효한 데이터로 방을 생성할 수 있다', async () => {
            const roomData = {
                roomName: '테스트방',
                hostId: hostUser._id,
                maxPlayers: 4,
                difficulty: 'medium',
                sentenceCount: 10
            };

            const room = new Room(roomData);
            await room.save();

            expect(room._id).toBeDefined();
            expect(room.roomName).toBe(roomData.roomName);
            expect(room.hostId.toString()).toBe(hostUser._id.toString());
            expect(room.gameStatus).toBe('waiting');
            expect(room.currentPlayers).toBe(0);
            expect(room.isPrivate).toBe(false);
        });

        test('비공개 방을 생성할 수 있다', async () => {
            const room = new Room({
                roomName: '비공개방',
                hostId: hostUser._id,
                isPrivate: true
            });

            room.generateRoomCode();
            await room.save();

            expect(room.isPrivate).toBe(true);
            expect(room.roomCode).toBeDefined();
            expect(room.roomCode).toHaveLength(6);
        });
    });

    describe('플레이어 관리', () => {
        let room;
        let player1, player2;

        beforeEach(async () => {
            room = new Room({
                roomName: '테스트방',
                hostId: hostUser._id,
                maxPlayers: 3
            });
            await room.save();

            // 테스트용 플레이어들 생성
            player1 = new User({
                nickname: '플레이어1',
                email: 'player1@example.com',
                password: 'password123'
            });
            await player1.save();

            player2 = new User({
                nickname: '플레이어2',
                email: 'player2@example.com',
                password: 'password123'
            });
            await player2.save();
        });

        test('플레이어를 추가할 수 있다', async () => {
            room.addPlayer(player1);
            expect(room.currentPlayers).toBe(1);
            expect(room.players[0].userId.toString()).toBe(player1._id.toString());
            expect(room.players[0].nickname).toBe(player1.nickname);
            expect(room.players[0].isReady).toBe(false);
        });

        test('같은 플레이어를 중복 추가할 수 없다', async () => {
            room.addPlayer(player1);
            
            expect(() => {
                room.addPlayer(player1);
            }).toThrow('이미 참가한 플레이어입니다.');
        });

        test('최대 인원을 초과하여 추가할 수 없다', async () => {
            // 방의 최대 인원은 3명
            room.addPlayer(player1);
            room.addPlayer(player2);
            
            const player3 = new User({
                nickname: '플레이어3',
                email: 'player3@example.com',
                password: 'password123'
            });
            await player3.save();
            
            room.addPlayer(player3); // 3명까지는 가능
            
            const player4 = new User({
                nickname: '플레이어4',
                email: 'player4@example.com',
                password: 'password123'
            });
            await player4.save();

            expect(() => {
                room.addPlayer(player4);
            }).toThrow('방이 가득 찼습니다.');
        });

        test('플레이어를 제거할 수 있다', async () => {
            room.addPlayer(player1);
            room.addPlayer(player2);
            
            room.removePlayer(player1._id);
            
            expect(room.currentPlayers).toBe(1);
            expect(room.players.find(p => p.userId.toString() === player1._id.toString())).toBeUndefined();
        });

        test('방장이 나가면 다른 플레이어가 방장이 된다', async () => {
            room.addPlayer(hostUser); // 방장도 플레이어로 추가
            room.addPlayer(player1);
            
            room.removePlayer(hostUser._id);
            
            expect(room.hostId.toString()).toBe(player1._id.toString());
        });
    });

    describe('준비 상태 관리', () => {
        let room;
        let player1, player2;

        beforeEach(async () => {
            room = new Room({
                roomName: '테스트방',
                hostId: hostUser._id
            });
            await room.save();

            player1 = new User({
                nickname: '플레이어1',
                email: 'player1@example.com',
                password: 'password123'
            });
            await player1.save();

            player2 = new User({
                nickname: '플레이어2',
                email: 'player2@example.com',
                password: 'password123'
            });
            await player2.save();

            room.addPlayer(player1);
            room.addPlayer(player2);
        });

        test('플레이어 준비 상태를 토글할 수 있다', async () => {
            room.togglePlayerReady(player1._id);
            
            const player = room.players.find(p => p.userId.toString() === player1._id.toString());
            expect(player.isReady).toBe(true);
            
            room.togglePlayerReady(player1._id);
            expect(player.isReady).toBe(false);
        });

        test('모든 플레이어가 준비되었는지 확인할 수 있다', async () => {
            expect(room.allPlayersReady()).toBe(false);
            
            room.togglePlayerReady(player1._id);
            expect(room.allPlayersReady()).toBe(false);
            
            room.togglePlayerReady(player2._id);
            expect(room.allPlayersReady()).toBe(true);
        });

        test('게임 시작 가능 여부를 확인할 수 있다', async () => {
            expect(room.canStartGame()).toBe(false);
            
            // 모든 플레이어 준비
            room.togglePlayerReady(player1._id);
            room.togglePlayerReady(player2._id);
            
            expect(room.canStartGame()).toBe(true);
        });
    });
});