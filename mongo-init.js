db = db.getSiblingDB('intervai_db');

// Create collections
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('questions');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ createdAt: -1 });

db.questions.createIndex({ sessionId: 1 });
db.questions.createIndex({ createdAt: -1 });

print('✅ Database initialized successfully');
print('✅ Collections created: users, sessions, questions');
print('✅ Indexes created');