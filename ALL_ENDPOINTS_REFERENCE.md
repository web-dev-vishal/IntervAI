# 🎯 Complete API Endpoints Reference - 36 Endpoints

## Base URL
```
Local: http://localhost:8000
Production: https://your-app.onrender.com
```

---

## 1️⃣ AUTHENTICATION (5 endpoints)

### 1. Register User
```http
POST /api/v1/user/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### 2. Login User
```http
POST /api/v1/user/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

### 3. Get User Profile
```http
GET /api/v1/user/profile
Cookie: token=<jwt_token>
```

### 4. Update Profile
```http
PUT /api/v1/user/profile
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "fullname": "John Updated"
}
```

### 5. Logout User
```http
POST /api/v1/user/logout
Cookie: token=<jwt_token>
```

---

## 2️⃣ SESSIONS (5 endpoints)

### 6. Create Session
```http
POST /api/v1/session/create
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "MongoDB", "REST APIs"]
}
```

### 7. Get All Sessions
```http
GET /api/v1/session
Cookie: token=<jwt_token>
```

### 8. Get Session By ID
```http
GET /api/v1/session/:id
Cookie: token=<jwt_token>
```

### 9. Update Session
```http
PUT /api/v1/session/:id
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "status": "completed",
  "duration": 90
}
```

### 10. Delete Session
```http
DELETE /api/v1/session/:id
Cookie: token=<jwt_token>
```

---

## 3️⃣ QUESTIONS (12 endpoints)

### 11. Generate AI Questions
```http
POST /api/v1/question/generate
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "Express.js"],
  "sessionId": "SESSION_ID"
}
```

### 12. Get Questions by Session
```http
GET /api/v1/question/session/:sessionId
Cookie: token=<jwt_token>
```

### 13. Get Single Question
```http
GET /api/v1/question/:id
Cookie: token=<jwt_token>
```

### 14. Search Questions
```http
GET /api/v1/question/search?q=node&limit=20
Cookie: token=<jwt_token>
```

### 15. Get Pinned Questions
```http
GET /api/v1/question/session/:sessionId/pinned
Cookie: token=<jwt_token>
```

### 16. Get Question Statistics
```http
GET /api/v1/question/session/:sessionId/stats
Cookie: token=<jwt_token>
```

### 17. Add Custom Question
```http
POST /api/v1/question/custom
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "sessionId": "SESSION_ID",
  "question": "What is REST API?",
  "answer": "REST API is..."
}
```

### 18. Update Question
```http
PUT /api/v1/question/:id
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "question": "Updated question",
  "answer": "Updated answer"
}
```

### 19. Toggle Pin Question
```http
PATCH /api/v1/question/:id/toggle-pin
Cookie: token=<jwt_token>
```

### 20. Regenerate Question
```http
POST /api/v1/question/:id/regenerate
Cookie: token=<jwt_token>
```

### 21. Delete Question
```http
DELETE /api/v1/question/:id
Cookie: token=<jwt_token>
```

---

## 4️⃣ EXPORTS (3 endpoints)

### 22. Export to PDF
```http
POST /api/v1/export/export/:sessionId?format=pdf
Cookie: token=<jwt_token>
```

### 23. Export to CSV
```http
POST /api/v1/export/export/:sessionId?format=csv
Cookie: token=<jwt_token>
```

### 24. Export to DOCX
```http
POST /api/v1/export/export/:sessionId?format=docx
Cookie: token=<jwt_token>
```

### 25. Check Export Status
```http
GET /api/v1/export/status/:jobId
Cookie: token=<jwt_token>
```

### 26. Download Export File
```http
GET /api/v1/export/download/:filename
Cookie: token=<jwt_token>
```

---

## 5️⃣ QUEUE STATUS (2 endpoints)

### 27. Check Question Job Status
```http
GET /api/v1/queue/question/:jobId
Cookie: token=<jwt_token>
```

### 28. Check Export Job Status
```http
GET /api/v1/queue/export/:jobId
Cookie: token=<jwt_token>
```

---

## 6️⃣ ANALYTICS (3 endpoints)

### 29. Get User Analytics
```http
GET /api/v1/analytics/user
Cookie: token=<jwt_token>
```

### 30. Get Session Analytics
```http
GET /api/v1/analytics/session/:sessionId
Cookie: token=<jwt_token>
```

### 31. Get Trending Topics
```http
GET /api/v1/analytics/trending?limit=10
```

---

## 7️⃣ NOTIFICATIONS (3 endpoints)

### 32. Get Notifications
```http
GET /api/v1/notifications?limit=20
Cookie: token=<jwt_token>
```

### 33. Mark Notifications as Read
```http
POST /api/v1/notifications/read
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "notificationIds": ["notif_123", "notif_456"]
}
```

### 34. Clear All Notifications
```http
DELETE /api/v1/notifications/clear
Cookie: token=<jwt_token>
```

---

## 8️⃣ BULK OPERATIONS (3 endpoints)

### 35. Bulk Delete Questions
```http
POST /api/v1/bulk/delete
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "questionIds": ["id1", "id2", "id3"]
}
```

### 36. Bulk Update Difficulty
```http
POST /api/v1/bulk/difficulty
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "questionIds": ["id1", "id2"],
  "difficulty": "hard"
}
```

### 37. Bulk Toggle Pin
```http
POST /api/v1/bulk/toggle-pin
Cookie: token=<jwt_token>
Content-Type: application/json

{
  "questionIds": ["id1", "id2"],
  "isPinned": true
}
```

---

## 9️⃣ HEALTH CHECK (1 endpoint)

### 38. Health Check
```http
GET /health
```

---

## 📊 Summary

| Category | Count |
|----------|-------|
| Authentication | 5 |
| Sessions | 5 |
| Questions | 12 |
| Exports | 3 |
| Queue Status | 2 |
| Analytics | 3 |
| Notifications | 3 |
| Bulk Operations | 3 |
| Health | 1 |
| **TOTAL** | **36** |

---

## 🔑 Authentication

All endpoints except the following require authentication:
- POST /api/v1/user/register
- POST /api/v1/user/login
- GET /health
- GET /api/v1/analytics/trending

Authentication is done via JWT token in HTTP-only cookie.

---

## 📝 Valid Values

### Roles
- Backend Developer
- Frontend Developer
- Full Stack Developer
- DevOps Engineer
- Data Scientist
- interviewer
- interviewee
- mock-interview
- practice

### Experience Levels
- entry-level
- junior
- mid-level
- senior
- lead
- expert

### Session Status
- pending
- in-progress
- completed
- cancelled

### Question Difficulty
- easy
- medium
- hard

### Export Formats
- pdf
- csv
- docx

---

## ⚡ Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 req/15min |
| Authentication | 10 req/15min |
| AI Generation | 20 req/hour |
| Export | 5 req/10min |
| Pin Toggle | 30 req/min |

---

## 🎯 Quick Test Sequence

1. Register → Login → Create Session
2. Generate Questions → Check Status → View Questions
3. Get Analytics → Get Notifications
4. Export PDF → Check Status → Download
5. Bulk Operations → Verify Changes

---

**All 36 endpoints documented! 🚀**
