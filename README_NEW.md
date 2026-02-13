# 🎯 Interview Prep API - Complete Backend System

> A comprehensive, production-ready interview preparation platform with AI-powered question generation, real-time notifications, analytics, and export capabilities.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## ✨ Features

### 🚀 Core Features
- 🤖 **AI-Powered Question Generation** - Generate interview questions using Groq AI (Llama 3.1)
- 👤 **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- 📝 **Session Management** - Create and manage interview preparation sessions
- ❓ **Question Management** - CRUD operations, pinning, search, and regeneration
- 📤 **Multi-Format Export** - Export questions to PDF, CSV, and DOCX formats
- 🔄 **Async Job Processing** - Background processing with Bull queues and Redis
- 📊 **Analytics & Insights** - User statistics, session analytics, and trending topics
- 🔔 **Real-time Notifications** - Redis Pub/Sub for job completion notifications
- 🔁 **Bulk Operations** - Batch delete, update difficulty, and toggle pin status
- ⚡ **Redis Caching** - Smart caching for AI-generated questions (1-hour TTL)
- 🛡️ **Rate Limiting** - Protect API endpoints from abuse
- 🐳 **Docker Support** - Complete containerization with MongoDB, Redis, API, and Worker

### 🔧 Technical Highlights
- **Microservices Architecture** - Separate API and Worker containers
- **Queue-Based Processing** - Bull queues for scalable async operations
- **Smart Caching Strategy** - Redis-based caching with automatic invalidation
- **Comprehensive Error Handling** - Graceful error handling and logging
- **Security Best Practices** - Helmet, CORS, input validation, and sanitization
- **Health Monitoring** - Health check endpoints for all services
- **Graceful Shutdown** - Proper cleanup of connections and resources

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│  MongoDB    │
│  (Frontend) │     │  Server     │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ├────▶ Redis (Cache + Queue)
                           │
                           ▼
                    ┌─────────────┐
                    │   Worker    │
                    │  (AI + Jobs)│
                    └─────────────┘
```

## 📦 Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js (ES Modules) |
| **Framework** | Express.js 5.x |
| **Database** | MongoDB 7.x with Mongoose ODM |
| **Cache/Queue** | Redis 7.x + Bull Queue |
| **AI Service** | Groq API (Llama 3.1) |
| **Authentication** | JWT + bcrypt |
| **Export** | PDFKit, csv-writer, docx |
| **Security** | Helmet, CORS, express-rate-limit |
| **Containerization** | Docker + Docker Compose |

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Groq API Key ([Get it here](https://console.groq.com))

### 1. Clone Repository
```bash
git clone <repository-url>
cd intervai
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

**Required Environment Variables:**
```env
PORT=8000
NODE_ENV=production
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DB_NAME=intervai_db
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
GROQ_API_KEY=your-groq-api-key-here
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123
CLIENT_URL=http://localhost:3000
```

### 3. Start with Docker
```bash
# Start all services (MongoDB, Redis, API, Worker)
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Verify Installation
```bash
# Health check
curl http://localhost:8000/health

# API info
curl http://localhost:8000/
```

## 📚 API Documentation

**Complete API documentation with sample requests:** [POSTMAN_COLLECTION.md](./POSTMAN_COLLECTION.md)

### Quick Reference - All Endpoints

#### 🔐 Authentication (5 endpoints)
- `POST /api/v1/user/register` - Register new user
- `POST /api/v1/user/login` - Login user
- `POST /api/v1/user/logout` - Logout user
- `GET /api/v1/user/profile` - Get user profile
- `PUT /api/v1/user/profile` - Update profile

#### 📝 Sessions (5 endpoints)
- `POST /api/v1/session/create` - Create interview session
- `GET /api/v1/session` - Get all sessions
- `GET /api/v1/session/:id` - Get session by ID
- `PUT /api/v1/session/:id` - Update session
- `DELETE /api/v1/session/:id` - Delete session

#### ❓ Questions (12 endpoints)
- `POST /api/v1/question/generate` - Generate AI questions (async)
- `POST /api/v1/question/:id/regenerate` - Regenerate single question
- `GET /api/v1/question/session/:sessionId` - Get session questions
- `GET /api/v1/question/:id` - Get single question
- `GET /api/v1/question/search` - Search questions
- `GET /api/v1/question/session/:sessionId/pinned` - Get pinned questions
- `GET /api/v1/question/session/:sessionId/stats` - Get statistics
- `POST /api/v1/question/custom` - Add custom question
- `PUT /api/v1/question/:id` - Update question
- `PATCH /api/v1/question/:id/toggle-pin` - Toggle pin status
- `DELETE /api/v1/question/:id` - Delete question

#### 📤 Exports (3 endpoints)
- `POST /api/v1/export/export/:sessionId?format=pdf` - Export questions
- `GET /api/v1/export/status/:jobId` - Check export status
- `GET /api/v1/export/download/:filename` - Download file

#### 🔄 Queue Status (2 endpoints)
- `GET /api/v1/queue/question/:jobId` - Question job status
- `GET /api/v1/queue/export/:jobId` - Export job status

#### 📊 Analytics (3 endpoints)
- `GET /api/v1/analytics/user` - User analytics
- `GET /api/v1/analytics/session/:sessionId` - Session analytics
- `GET /api/v1/analytics/trending` - Trending topics

#### 🔔 Notifications (3 endpoints)
- `GET /api/v1/notifications` - Get notifications
- `POST /api/v1/notifications/read` - Mark as read
- `DELETE /api/v1/notifications/clear` - Clear all

#### 🔁 Bulk Operations (3 endpoints)
- `POST /api/v1/bulk/delete` - Bulk delete questions
- `POST /api/v1/bulk/difficulty` - Bulk update difficulty
- `POST /api/v1/bulk/toggle-pin` - Bulk toggle pin

**Total: 36 API Endpoints**

## 🔧 Development

### Local Development (Without Docker)

1. **Install Dependencies**
```bash
npm install
```

2. **Start MongoDB & Redis**
```bash
# MongoDB
mongod --dbpath ./data/db

# Redis
redis-server
```

3. **Update .env for Local**
```env
MONGO_URI=mongodb://localhost:27017/intervai_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

4. **Start Services**
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Worker
node worker.js
```

### Project Structure
```
intervai/
├── config/              # Configuration files
│   ├── db.js           # MongoDB connection
│   ├── redis.js        # Redis client
│   └── queue.js        # Bull queue setup
├── controllers/         # Request handlers
│   ├── userController.js
│   ├── sessionController.js
│   ├── questionController.js
│   ├── exportController.js
│   ├── analyticsController.js
│   ├── notificationController.js
│   └── bulkController.js
├── models/             # Mongoose schemas
│   ├── user.model.js
│   ├── session.model.js
│   └── question.model.js
├── services/           # Business logic
│   ├── cacheService.js
│   ├── exportService.js
│   ├── analyticsService.js
│   └── notificationService.js
├── middlewares/        # Express middlewares
│   ├── auth.middleware.js
│   └── rateLimiter.js
├── routes/             # API routes
│   ├── user.routes.js
│   ├── session.routes.js
│   ├── question.routes.js
│   ├── export.routes.js
│   ├── queue.routes.js
│   ├── analytics.routes.js
│   ├── notification.routes.js
│   └── bulk.routes.js
├── exports/            # Generated export files
├── index.js            # API server entry
├── worker.js           # Background worker
├── docker-compose.yml  # Docker orchestration
├── Dockerfile          # API container
├── Dockerfile.worker   # Worker container
└── package.json        # Dependencies
```

## 🐳 Docker Services

### Services Overview
| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **mongodb** | mongo:7 | 27017 | MongoDB database |
| **redis** | redis:7-alpine | 6379 | Cache & queue backend |
| **api** | Custom | 8000 | Express API server |
| **worker** | Custom | - | Background job processor |

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Restart specific service
docker-compose restart api

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

## 📊 Monitoring & Logs

### Health Checks
```bash
# API Health
curl http://localhost:8000/health

# MongoDB Health
docker exec intervai-mongodb mongosh --eval "db.adminCommand('ping')"

# Redis Health
docker exec intervai-redis redis-cli -a redis123 ping
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f mongodb
docker-compose logs -f redis
```

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based auth with 7-day expiry
- ✅ **Password Hashing** - bcrypt with 10 salt rounds
- ✅ **Rate Limiting** - Multiple tiers (general, auth, AI generation)
- ✅ **CORS Protection** - Configurable allowed origins
- ✅ **Helmet Security** - HTTP headers protection
- ✅ **Input Validation** - Comprehensive request validation
- ✅ **SQL Injection Prevention** - Mongoose parameterized queries
- ✅ **XSS Protection** - Input sanitization
- ✅ **Redis Password** - Password-protected Redis instance

## ⚡ Performance Optimizations

- 🚀 **Redis Caching** - 1-hour TTL for AI-generated questions
- 🚀 **Database Indexing** - Optimized queries with compound indexes
- 🚀 **Connection Pooling** - MongoDB connection pool (max 10)
- 🚀 **Async Processing** - Background jobs for heavy operations
- 🚀 **Lean Queries** - MongoDB lean() for read-only operations
- 🚀 **Pagination** - Limit query results to prevent overload

## 🧪 Testing

### Manual Testing with Postman
Import the collection from [POSTMAN_COLLECTION.md](./POSTMAN_COLLECTION.md)

### Test Workflow
1. ✅ Register user
2. ✅ Login (saves JWT cookie)
3. ✅ Create session
4. ✅ Generate questions (async)
5. ✅ Check job status
6. ✅ View questions
7. ✅ Export to PDF/CSV/DOCX
8. ✅ Check analytics

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**
```bash
# Check MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

**2. Redis Connection Failed**
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker exec intervai-redis redis-cli -a redis123 ping

# Restart Redis
docker-compose restart redis
```

**3. Worker Not Processing Jobs**
```bash
# Check worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker
```

**4. AI Generation Fails**
- Verify GROQ_API_KEY is set correctly
- Check API key validity at https://console.groq.com
- Review worker logs for detailed errors

## 📈 Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
worker:
  deploy:
    replicas: 3  # Run 3 worker instances
```

### Redis Cluster
For production, consider Redis Cluster or Redis Sentinel for high availability.

### Load Balancing
Use Nginx or HAProxy to load balance multiple API instances.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [Groq](https://groq.com) - AI inference platform
- [Bull](https://github.com/OptimalBits/bull) - Queue system
- [MongoDB](https://www.mongodb.com) - Database
- [Redis](https://redis.io) - Cache & queue backend
- [Express](https://expressjs.com) - Web framework

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check [POSTMAN_COLLECTION.md](./POSTMAN_COLLECTION.md) for API details
- Review Docker logs for debugging

---

**Built with ❤️ for interview preparation**
