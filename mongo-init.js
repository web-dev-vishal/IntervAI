db.createUser({
  user: 'intervai_user',
  pwd: 'intervai_password',
  roles: [
    {
      role: 'readWrite',
      db: 'intervai_db',
    },
  ],
});

db = db.getSiblingDB('intervai_db');

db.users.createIndex({ email: 1 }, { unique: true });
db.sessions.createIndex({ user: 1, createdAt: -1 });
db.sessions.createIndex({ user: 1, status: 1 });
db.questions.createIndex({ session: 1, isPinned: -1, createdAt: -1 });
db.questions.createIndex({ session: 1, createdAt: -1 });