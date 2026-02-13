# 📮 Postman Quick Guide - All 36 Endpoints

## 🔧 Setup

### Base URL
```
Local: http://localhost:8000
Production: https://your-app.onrender.com
```

### Variables to Set in Postman
1. Create environment
2. Add variables:
   - `baseUrl`: `http://localhost:8000`
   - `sessionId`: (will be set after creating session)
   - `questionId`: (will be set after generating questions)
   - `jobId`: (will be set after async operations)

---

## 📋 All Endpoints with Sample Data

### 1️⃣ AUTHENTICATION (5 endpoints)

#### 1.1 Register User
```
POST {{baseUrl}}/api/v1/user/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### 1.2 Login User
```
POST {{baseUrl}}/api/v1/user/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```
**Note:** Cookie is automatically saved

#### 1.3 Get User Profile
```
GET {{baseUrl}}/api/v1/user/profile
```

#### 1.4 Update Profile
```
PUT {{baseUrl}}/api/v1/user/profile
Content-Type: application/json

{
  "fullname": "John Updated Doe"
}
```

#### 1.5 Logout User
```
POST {{baseUrl}}/api/v1/user/logout
```

---

### 2️⃣ SESSIONS (5 endpoints)

#### 2.1 Create Session
```
POST {{baseUrl}}/api/v1/session/create
Content-Type: application/json

{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "MongoDB", "REST APIs", "Docker"]
}
```
**Save the `_id` from response as `sessionId`**

**Valid Roles:**
- Backend Developer
- Frontend Developer
- Full Stack Developer
- DevOps Engineer
- Data Scientist

**Valid Experience:**
- entry-level
- junior
- mid-level
- senior
- lead
- expert

#### 2.2 Get All Sessions
```
GET {{baseUrl}}/api/v1/session
```

#### 2.3 Get Session By ID
```
GET {{baseUrl}}/api/v1/session/{{sessionId}}
```

#### 2.4 Update Session
```
PUT {{baseUrl}}/api/v1/session/{{sessionId}}
Content-Type: application/json

{
  "status": "completed",
  "duration": 90
}
```

**Valid Status:** pending, in-progress, completed, cancelled

#### 2.5 Delete Session
```
DELETE {{baseUrl}}/api/v1/session/{{sessionId}}
```

---

### 3️⃣ QUESTIONS (12 endpoints)

#### 3.1 Generate AI Questions (Async)
```
POST {{baseUrl}}/api/v1/question/generate
Content-Type: application/json

{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "Express.js", "MongoDB"],
  "sessionId": "{{sessionId}}"
}
```
**Save the `jobId` from response**

#### 3.2 Get Questions by Session
```
GET {{baseUrl}}/api/v1/question/session/{{sessionId}}
```

#### 3.3 Get Single Question
```
GET {{baseUrl}}/api/v1/question/{{questionId}}
```

#### 3.4 Search Questions
```
GET {{baseUrl}}/api/v1/question/search?q=node&limit=20
```

#### 3.5 Get Pinned Questions
```
GET {{baseUrl}}/api/v1/question/session/{{sessionId}}/pinned
```

#### 3.6 Get Question Statistics
```
GET {{baseUrl}}/api/v1/question/session/{{sessionId}}/stats
```

#### 3.7 Add Custom Question
```
POST {{baseUrl}}/api/v1/question/custom
Content-Type: application/json

{
  "sessionId": "{{sessionId}}",
  "question": "What is the difference between SQL and NoSQL databases?",
  "answer": "SQL databases are relational and use structured schemas, while NoSQL databases are non-relational and offer flexible schemas."
}
```

#### 3.8 Update Question
```
PUT {{baseUrl}}/api/v1/question/{{questionId}}
Content-Type: application/json

{
  "question": "Updated question text",
  "answer": "Updated answer text"
}
```

#### 3.9 Toggle Pin Question
```
PATCH {{baseUrl}}/api/v1/question/{{questionId}}/toggle-pin
```

#### 3.10 Regenerate Question
```
POST {{baseUrl}}/api/v1/question/{{questionId}}/regenerate
```

#### 3.11 Delete Question
```
DELETE {{baseUrl}}/api/v1/question/{{questionId}}
```

---

### 4️⃣ EXPORTS (3 endpoints)

#### 4.1 Export Questions (PDF)
```
POST {{baseUrl}}/api/v1/export/export/{{sessionId}}?format=pdf
```
**Save the `jobId` from response**

#### 4.2 Export Questions (CSV)
```
POST {{baseUrl}}/api/v1/export/export/{{sessionId}}?format=csv
```

#### 4.3 Export Questions (DOCX)
```
POST {{baseUrl}}/api/v1/export/export/{{sessionId}}?format=docx
```

#### 4.4 Check Export Status
```
GET {{baseUrl}}/api/v1/export/status/{{jobId}}
```

#### 4.5 Download Export File
```
GET {{baseUrl}}/api/v1/export/download/{{filename}}
```

---

### 5️⃣ QUEUE STATUS (2 endpoints)

#### 5.1 Check Question Job Status
```
GET {{baseUrl}}/api/v1/queue/question/{{jobId}}
```

#### 5.2 Check Export Job Status
```
GET {{baseUrl}}/api/v1/queue/export/{{jobId}}
```

---

### 6️⃣ ANALYTICS (3 endpoints)

#### 6.1 Get User Analytics
```
GET {{baseUrl}}/api/v1/analytics/user
```

#### 6.2 Get Session Analytics
```
GET {{baseUrl}}/api/v1/analytics/session/{{sessionId}}
```

#### 6.3 Get Trending Topics
```
GET {{baseUrl}}/api/v1/analytics/trending?limit=10
```

---

### 7️⃣ NOTIFICATIONS (3 endpoints)

#### 7.1 Get Notifications
```
GET {{baseUrl}}/api/v1/notifications?limit=20
```

#### 7.2 Mark Notifications as Read
```
POST {{baseUrl}}/api/v1/notifications/read
Content-Type: application/json

{
  "notificationIds": ["notif_1710504000000_abc123", "notif_1710504100000_def456"]
}
```

#### 7.3 Clear All Notifications
```
DELETE {{baseUrl}}/api/v1/notifications/clear
```

---

### 8️⃣ BULK OPERATIONS (3 endpoints)

#### 8.1 Bulk Delete Questions
```
POST {{baseUrl}}/api/v1/bulk/delete
Content-Type: application/json

{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667",
    "65fa111222333444555668"
  ]
}
```

#### 8.2 Bulk Update Difficulty
```
POST {{baseUrl}}/api/v1/bulk/difficulty
Content-Type: application/json

{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667"
  ],
  "difficulty": "hard"
}
```
**Valid Difficulty:** easy, medium, hard

#### 8.3 Bulk Toggle Pin
```
POST {{baseUrl}}/api/v1/bulk/toggle-pin
Content-Type: application/json

{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667"
  ],
  "isPinned": true
}
```

---

### 9️⃣ HEALTH CHECK (1 endpoint)

#### 9.1 Health Check
```
GET {{baseUrl}}/health
```

---

## 🔄 Complete Test Flow

### Step 1: Authentication
1. Register User → Get success
2. Login User → Cookie saved automatically
3. Get Profile → Verify user data

### Step 2: Create Session
1. Create Session → Save `sessionId`
2. Get All Sessions → Verify session exists
3. Get Session By ID → Verify details

### Step 3: Generate Questions
1. Generate Questions → Save `jobId`
2. Check Job Status → Wait for "completed"
3. Get Questions by Session → View generated questions

### Step 4: Manage Questions
1. Get Single Question → Save `questionId`
2. Toggle Pin → Pin important question
3. Get Pinned Questions → Verify pinned
4. Update Question → Modify text
5. Add Custom Question → Add manual question

### Step 5: Analytics
1. Get User Analytics → View stats
2. Get Session Analytics → View session metrics
3. Get Trending Topics → See popular topics

### Step 6: Export
1. Export to PDF → Save `jobId`
2. Check Export Status → Wait for "completed"
3. Download File → Get PDF

### Step 7: Bulk Operations
1. Get multiple question IDs
2. Bulk Update Difficulty → Change to "hard"
3. Bulk Toggle Pin → Pin multiple
4. Bulk Delete → Remove multiple

### Step 8: Notifications
1. Get Notifications → View job notifications
2. Mark as Read → Mark some read
3. Clear All → Clear notifications

---

## 📊 Expected Response Times

| Operation | Time |
|-----------|------|
| Health Check | < 50ms |
| Register/Login | < 200ms |
| Create Session | < 100ms |
| Queue Job | < 100ms |
| AI Generation | 30-60s |
| Get Questions | < 100ms |
| Analytics | < 200ms |
| Export Generation | 5-15s |

---

## 🔑 Authentication Notes

1. **Cookie-based Auth**: JWT token stored in HTTP-only cookie
2. **Auto-saved**: Postman saves cookie automatically after login
3. **Expiry**: 7 days
4. **Required**: All endpoints except register, login, health, trending

---

## 🐛 Common Errors

### 401 Unauthorized
- **Cause**: Not logged in or token expired
- **Fix**: Login again

### 400 Bad Request
- **Cause**: Invalid data format
- **Fix**: Check request body matches examples

### 404 Not Found
- **Cause**: Invalid ID or resource doesn't exist
- **Fix**: Verify IDs are correct

### 429 Too Many Requests
- **Cause**: Rate limit exceeded
- **Fix**: Wait and try again

---

## 💡 Pro Tips

1. **Use Variables**: Set `sessionId`, `questionId`, `jobId` as environment variables
2. **Save Responses**: Use Postman Tests to auto-save IDs
3. **Collections**: Organize by feature
4. **Environments**: Create separate for local/production
5. **Pre-request Scripts**: Auto-login before requests

---

## 📝 Sample Test Script (Postman)

```javascript
// Auto-save session ID
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.data && response.data.session) {
        pm.environment.set("sessionId", response.data.session._id);
    }
}

// Auto-save job ID
if (pm.response.code === 202) {
    const response = pm.response.json();
    if (response.jobId) {
        pm.environment.set("jobId", response.jobId);
    }
}
```

---

**Total Endpoints: 36**
**Ready to test! 🚀**
