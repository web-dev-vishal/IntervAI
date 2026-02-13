# 🚀 Quick Test Guide - Interview Prep API

## Prerequisites
- Docker & Docker Compose installed
- Groq API Key ([Get free key](https://console.groq.com))

## Step 1: Setup (2 minutes)

```bash
# 1. Configure environment
cp .env.example .env

# 2. Edit .env and add your Groq API key
# GROQ_API_KEY=your-key-here

# 3. Start all services
docker-compose up -d

# 4. Wait 30 seconds for services to start
# Then check health
curl http://localhost:8000/health
```

## Step 2: Test Complete Flow (5 minutes)

### 1. Register User
```bash
curl -X POST http://localhost:8000/api/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Login (Save Cookie)
```bash
curl -X POST http://localhost:8000/api/v1/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### 3. Create Session
```bash
curl -X POST http://localhost:8000/api/v1/session/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "role": "Backend Developer",
    "experience": "mid-level",
    "topicsToFocus": ["Node.js", "MongoDB", "REST APIs"]
  }'
```

**Copy the session `_id` from response!**

### 4. Generate Questions (Async)
```bash
# Replace SESSION_ID with actual ID from step 3
curl -X POST http://localhost:8000/api/v1/question/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "role": "Backend Developer",
    "experience": "mid-level",
    "topicsToFocus": ["Node.js", "MongoDB", "REST APIs"],
    "sessionId": "SESSION_ID"
  }'
```

**Copy the `jobId` from response!**

### 5. Check Job Status
```bash
# Replace JOB_ID with actual ID from step 4
curl -X GET http://localhost:8000/api/v1/queue/question/JOB_ID \
  -b cookies.txt
```

**Wait until status is "completed" (30-60 seconds)**

### 6. View Generated Questions
```bash
# Replace SESSION_ID
curl -X GET http://localhost:8000/api/v1/question/session/SESSION_ID \
  -b cookies.txt
```

### 7. Get User Analytics
```bash
curl -X GET http://localhost:8000/api/v1/analytics/user \
  -b cookies.txt
```

### 8. Get Notifications
```bash
curl -X GET http://localhost:8000/api/v1/notifications \
  -b cookies.txt
```

### 9. Export to PDF
```bash
# Replace SESSION_ID
curl -X POST "http://localhost:8000/api/v1/export/export/SESSION_ID?format=pdf" \
  -b cookies.txt
```

**Copy the `jobId` from response!**

### 10. Check Export Status
```bash
# Replace EXPORT_JOB_ID
curl -X GET http://localhost:8000/api/v1/export/status/EXPORT_JOB_ID \
  -b cookies.txt
```

### 11. Download PDF
```bash
# Replace FILENAME from export status response
curl -X GET http://localhost:8000/api/v1/export/download/FILENAME \
  -b cookies.txt \
  -o interview_questions.pdf
```

## Step 3: Test New Features

### Bulk Operations

**Get Question IDs first:**
```bash
curl -X GET http://localhost:8000/api/v1/question/session/SESSION_ID \
  -b cookies.txt | grep "_id"
```

**Bulk Update Difficulty:**
```bash
curl -X POST http://localhost:8000/api/v1/bulk/difficulty \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questionIds": ["QUESTION_ID_1", "QUESTION_ID_2"],
    "difficulty": "hard"
  }'
```

**Bulk Toggle Pin:**
```bash
curl -X POST http://localhost:8000/api/v1/bulk/toggle-pin \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "questionIds": ["QUESTION_ID_1", "QUESTION_ID_2"],
    "isPinned": true
  }'
```

### Analytics

**Session Analytics:**
```bash
curl -X GET http://localhost:8000/api/v1/analytics/session/SESSION_ID \
  -b cookies.txt
```

**Trending Topics:**
```bash
curl -X GET http://localhost:8000/api/v1/analytics/trending?limit=10
```

### Search Questions
```bash
curl -X GET "http://localhost:8000/api/v1/question/search?q=node&limit=20" \
  -b cookies.txt
```

## Step 4: Verify Docker Services

```bash
# Check all services are running
docker-compose ps

# View API logs
docker-compose logs -f api

# View Worker logs
docker-compose logs -f worker

# Check MongoDB
docker exec intervai-mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec intervai-redis redis-cli -a redis123 ping
```

## Common Issues & Solutions

### Issue: "Connection refused" error
**Solution:** Wait 30-60 seconds for services to fully start

### Issue: "Invalid token" error
**Solution:** Login again to get fresh token

### Issue: "Job not found" error
**Solution:** Check if worker is running: `docker-compose logs worker`

### Issue: "AI generation failed"
**Solution:** Verify GROQ_API_KEY in .env file

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart API
docker-compose restart api

# Restart Worker
docker-compose restart worker

# Clean restart (removes data)
docker-compose down -v && docker-compose up -d

# Check health
curl http://localhost:8000/health
```

## Testing Checklist

- [ ] Services start successfully
- [ ] Health check returns OK
- [ ] User registration works
- [ ] User login works
- [ ] Session creation works
- [ ] Question generation queued
- [ ] Job status shows progress
- [ ] Questions generated successfully
- [ ] Analytics show correct data
- [ ] Notifications received
- [ ] Export to PDF works
- [ ] Export to CSV works
- [ ] Export to DOCX works
- [ ] Bulk operations work
- [ ] Search works
- [ ] All Docker services healthy

## Performance Benchmarks

Expected response times:
- Health check: < 50ms
- Register/Login: < 200ms
- Create session: < 100ms
- Queue question generation: < 100ms
- Question generation (worker): 30-60 seconds
- Get questions: < 100ms
- Analytics: < 200ms
- Export queue: < 100ms
- Export generation (worker): 5-15 seconds

## Next Steps

1. ✅ Test all endpoints using Postman
2. ✅ Review [POSTMAN_COLLECTION.md](./POSTMAN_COLLECTION.md) for detailed API docs
3. ✅ Check [README_NEW.md](./README_NEW.md) for complete documentation
4. ✅ Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for changes

## Support

If you encounter issues:
1. Check Docker logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure ports 8000, 27017, 6379 are available
4. Check [POSTMAN_COLLECTION.md](./POSTMAN_COLLECTION.md) for correct request format

---

**Happy Testing! 🎉**
