🤖 AI Interview Preparation Coach

An AI-powered interview preparation coach built using the Groq API, designed to help job seekers practice interviews, get real-time responses, and improve their confidence before facing real interviews.

🌟 Features

✅ AI-Powered Questions – Get intelligent and tailored interview questions based on your role & experience.  
✅ Answer Coaching – Practice and receive feedback like a real interviewer.  
✅ Session Management – Create, manage, and revisit your mock interview sessions.  
✅ Pin Important Questions – Highlight questions you want to revisit later.  
✅ Secure Auth – User authentication with JWT and cookie-based sessions.  
✅ Export Functionality – Download your questions & answers in PDF, CSV, or DOCX.  
✅ Rate Limiting – Redis-based protection against abuse.  
✅ Caching – 30–40 % API-cost reduction through intelligent Redis caching.  
✅ Async Processing – Bull Queue for background AI generation & exports.  
✅ Docker Ready – One-command spin-up with docker-compose.  

🛠️ Tech Stack

Backend: Express.js 🚀 + MongoDB 🍃  
AI Integration: Google Gemini API → **Groq API** (faster, cheaper, production-grade)  
Auth & Security: JWT 🔐 + bcryptjs 🔑  
Cache & Queue: Redis + Bull  
Export Engine: Puppeteer (PDF), csv-writer, docx-templates  
Container: Node 20-alpine, MongoDB 7, Redis 7  

# Interview Prep API – Production-Ready Backend

## 🚀 Features (condensed)

- JWT auth with bcrypt password hashing & cookie sessions  
- Create, update, delete, list interview prep sessions  
- Groq-powered question generation with 24 h Redis cache  
- Pin/unpin questions, full-text search, per-session stats  
- Async export jobs (PDF, CSV, DOCX) with download links  
- Distributed rate-limiting (auth, generation, export)  
- Health, metrics, graceful shutdown, Docker & Compose  
- Helmet, CORS, input validation, XSS & NoSQL-injection protection  

## 📋 Prerequisites

- Node.js 18 +  
- MongoDB 5 + (or Docker)  
- Redis 6 + (or Docker)  
- Groq API key (free tier works)  

## 🛠️ Installation

### Local Development

1. Clone & enter  
   git clone <your-repo>  
   cd intervai-backend  

2. Install  
   npm install  

3. Configure  
   cp .env.example .env  
   # add Groq, Mongo, Redis, JWT_SECRET (32+ chars)  

4. Run  
   # terminal 1 – API  
   npm run dev  
   # terminal 2 – worker  
   npm run worker:dev  

### Docker Production

1. cp .env.example .env   # fill production values  
2. docker-compose up --build -d  
3. docker-compose logs -f   # watch  
4. docker-compose down -v   # full cleanup  

## 📁 Project Structure (unchanged, already correct)

intervai-backend/  
├── config/         # db, redis, queue config  
├── controllers/    # route handlers  
├── middlewares/    # auth, rate-limit, validation  
├── models/         # Mongoose schemas  
├── routes/         # REST v1 endpoints  
├── services/       # cache, export, groq wrappers  
├── exports/        # generated files (git-ignored)  
├── index.js        # API entry  
├── worker.js       # Bull worker entry  
└── docker-compose.yml  

## 🔌 API Endpoints (unchanged, already correct)

### Auth
POST   /api/v1/user/register  
POST   /api/v1/user/login  
POST   /api/v1/user/logout  
GET    /api/v1/user/profile  
PUT    /api/v1/user/profile  

### Sessions
POST   /api/v1/session/create  
GET    /api/v1/session  
GET    /api/v1/session/:id  
PUT    /api/v1/session/:id  
DELETE /api/v1/session/:id  

### Questions
POST   /api/v1/question/generate  
POST   /api/v1/question/:id/regenerate  
GET    /api/v1/question/session/:sessionId  
GET    /api/v1/question/session/:sessionId/pinned  
GET    /api/v1/question/session/:sessionId/stats  
GET    /api/v1/question/search?q=term  
GET    /api/v1/question/:id  
POST   /api/v1/question/custom  
PUT    /api/v1/question/:id  
PATCH  /api/v1/question/:id/toggle-pin  
DELETE /api/v1/question/:id  

### Export
GET    /api/v1/export/session/:sessionId?format=pdf|csv|docx  
GET    /api/v1/export/status/:jobId  
GET    /api/v1/export/download/:filename  

### Queue
GET    /api/v1/queue/job/:jobId  

### Health
GET    /health  

## 🔐 Environment Variables (production-ready sample)

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | production |
| MONGO_URI | MongoDB connection | mongodb://admin:password@mongodb:27017/intervai?authSource=admin |
| JWT_SECRET | 32+ random chars | 9f8a3b2c... |
| GROQ_API_KEY | Groq console | gsk_... |
| REDIS_HOST | redis (service name) | redis |
| REDIS_PORT | 6379 | 6379 |
| CLIENT_URL | your frontend | https://app.intervai.com |

## 🐳 Docker Services (Compose file already provided)

- **mongodb** – official 7.0 image, persistent volume  
- **redis** – official 7-alpine, persistent volume  
- **api** – Node app, port 5000, restart unless-stopped  
- **worker** – same image, runs worker.js, restart unless-stopped  

## 📊 Monitoring & Ops

### Health
curl https://api.intervai.com/health   # returns {“status”:“ok”,“ts”:...}

### Logs
docker-compose logs -f api  
docker-compose logs -f worker  

### Redis CLI
docker exec -it intervai-redis redis-cli  
> PING  
> KEYS questions:*  

### Mongo Shell
docker exec -it intervai-mongodb mongosh -u admin -p adminpassword  
> use intervai_db  
> db.users.countDocuments()  

## 🧪 Quick API Test (copy-paste ready)

# register  
curl -X POST http://localhost:5000/api/v1/user/register -H "Content-Type: application/json" -d '{"fullname":"Jane Doe","email":"jane@example.com","password":"pass1234"}'

# login (saves cookie)  
curl -X POST http://localhost:5000/api/v1/user/login -H "Content-Type: application/json" -d '{"email":"jane@example.com","password":"pass1234"}' -c cookies.txt

# create session  
curl -X POST http://localhost:5000/api/v1/session/create -H "Content-Type: application/json" -b cookies.txt -d '{"role":"Full-Stack Developer","experience":"senior","topicsToFocus":["System Design","Node.js","PostgreSQL"]}'

# generate questions  
curl -X POST http://localhost:5000/api/v1/question/generate -H "Content-Type: application/json" -b cookies.txt -d '{"sessionId":"SESSION_ID_HERE"}'

# export PDF  
curl -X GET "http://localhost:5000/api/v1/export/session/SESSION_ID?format=pdf" -b cookies.txt -o interview.pdf  

## 🚀 Deployment Checklist (production)

- [ ] .env filled with production secrets  
- [ ] NODE_ENV=production  
- [ ] JWT_SECRET 32+ random chars  
- [ ] MongoDB users & roles hardened  
- [ ] Redis protected with requirepass  
- [ ] API behind HTTPS (Let’s Encrypt / CDN)  
- [ ] Firewall: 443, 80 open; 27017, 6379 closed externally  
- [ ] Log aggregation (Loki, CloudWatch, etc.)  
- [ ] Daily MongoDB + Redis snapshots  
- [ ] Enable Docker restart policies & auto-updates  

## 📈 Performance Notes

- Redis cache TTL = 24 h for identical question prompts  
- Bull default concurrency = 5 (tunable via WORKER_CONCURRENCY)  
- Mongo indexed on userId, sessionId, isPinned, createdAt  
- Connection pooling: max 10 (configurable)  

## 🔒 Security Hardening Already Included

- Helmet sets HSTS, X-Frame-Options, X-XSS-Protection  
- CORS whitelist to CLIENT_URL only  
- Rate-limit: auth 5/min, generation 10/min, export 5/min per IP  
- Joi validation + mongo-sanitize against NoSQL injection  
- bcrypt 12 rounds  
- JWT http-only, secure, same-site strict cookies  

## 📝 License & Contributing

MIT – feel free to fork.  
Issues & PRs welcome; please open against `main` branch.