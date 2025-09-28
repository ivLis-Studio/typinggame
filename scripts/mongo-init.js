# MongoDB 초기화 스크립트
db = db.getSiblingDB('typinggame');

// 사용자 생성
db.createUser({
  user: 'typinggame',
  pwd: 'typinggame123',
  roles: [
    {
      role: 'readWrite',
      db: 'typinggame'
    }
  ]
});

// 인덱스 생성 (성능 최적화)
db.users.createIndex({ "nickname": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.rooms.createIndex({ "gameStatus": 1, "isPrivate": 1 });
db.rooms.createIndex({ "roomCode": 1 }, { unique: true, sparse: true });
db.sentences.createIndex({ "difficulty": 1, "language": 1 });
db.gamerecords.createIndex({ "players.userId": 1 });
db.gamerecords.createIndex({ "startedAt": -1 });

print('MongoDB 초기화 완료');