# 📮 Interview Prep API - Postman Collection Guide

## 🚀 Base URL
```
http://localhost:8000
```

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Session Management](#session-management)
4. [Question Management](#question-management)
5. [Export Management](#export-management)
6. [Queue Status](#queue-status)
7. [Analytics](#analytics)
8. [Notifications](#notifications)
9. [Bulk Operations](#bulk-operations)

---

## 🔐 Authentication

### 1. Register User
**POST** `/api/v1/user/register`

**Body (JSON):**
```json
{
  "fullname": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

---

### 2. Login User
**POST** `/api/v1/user/login`

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome back, John Doe",
  "data": {
    "user": {
      "_id": "65f1234567890abcdef12345",
      "fullname": "John Doe",
      "email": "john.doe@example.com",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T10:30:00.000Z"
    }
  }
}
```

**Note:** Cookie `token` is set automatically

---

### 3. Logout User
**POST** `/api/v1/user/logout`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4. Get User Profile
**GET** `/api/v1/user/profile`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "65f1234567890abcdef12345",
      "fullname": "John Doe",
      "email": "john.doe@example.com",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T10:30:00.000Z"
    }
  }
}
```

---

### 5. Update User Profile
**PUT** `/api/v1/user/profile`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "fullname": "John Updated Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "65f1234567890abcdef12345",
      "fullname": "John Updated Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

---

## 📝 Session Management

### 6. Create Session
**POST** `/api/v1/session/create`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "MongoDB", "REST APIs", "Docker"]
}
```

**Valid Roles:**
- `Backend Developer`
- `Frontend Developer`
- `Full Stack Developer`
- `DevOps Engineer`
- `Data Scientist`
- `interviewer`
- `interviewee`
- `mock-interview`
- `practice`

**Valid Experience Levels:**
- `entry-level`
- `junior`
- `mid-level`
- `senior`
- `lead`
- `expert`

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "_id": "65f9876543210fedcba98765",
      "user": "65f1234567890abcdef12345",
      "role": "Backend Developer",
      "experience": "mid-level",
      "topicsToFocus": ["Node.js", "MongoDB", "REST APIs", "Docker"],
      "questions": [],
      "status": "pending",
      "duration": 60,
      "createdAt": "2024-03-15T11:00:00.000Z",
      "updatedAt": "2024-03-15T11:00:00.000Z"
    }
  }
}
```

---

### 7. Get All Sessions
**GET** `/api/v1/session`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Sessions retrieved successfully",
  "count": 2,
  "data": {
    "sessions": [
      {
        "_id": "65f9876543210fedcba98765",
        "role": "Backend Developer",
        "experience": "mid-level",
        "topicsToFocus": ["Node.js", "MongoDB"],
        "status": "completed",
        "questions": [...],
        "createdAt": "2024-03-15T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 8. Get Session By ID
**GET** `/api/v1/session/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Example:** `/api/v1/session/65f9876543210fedcba98765`

**Response:**
```json
{
  "success": true,
  "message": "Session retrieved successfully",
  "data": {
    "session": {
      "_id": "65f9876543210fedcba98765",
      "user": "65f1234567890abcdef12345",
      "role": "Backend Developer",
      "experience": "mid-level",
      "topicsToFocus": ["Node.js", "MongoDB", "REST APIs"],
      "questions": [...],
      "status": "in-progress",
      "duration": 60
    }
  }
}
```

---

### 9. Update Session
**PUT** `/api/v1/session/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "status": "completed",
  "duration": 90
}
```

**Valid Status Values:**
- `pending`
- `in-progress`
- `completed`
- `cancelled`

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {...}
  }
}
```

---

### 10. Delete Session
**DELETE** `/api/v1/session/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## ❓ Question Management

### 11. Generate AI Questions (Async)
**POST** `/api/v1/question/generate`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "role": "Backend Developer",
  "experience": "mid-level",
  "topicsToFocus": ["Node.js", "Express.js", "MongoDB"],
  "sessionId": "65f9876543210fedcba98765"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question generation queued. Check status using job ID",
  "jobId": "12345",
  "checkStatusUrl": "/api/v1/queue/question/12345",
  "estimatedTime": "30-60 seconds"
}
```

---

### 12. Check Question Generation Status
**GET** `/api/v1/queue/question/:jobId`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Example:** `/api/v1/queue/question/12345`

**Response (In Progress):**
```json
{
  "success": true,
  "status": "active",
  "progress": 60,
  "message": "Job is active"
}
```

**Response (Completed):**
```json
{
  "success": true,
  "status": "completed",
  "message": "Questions generated successfully",
  "data": {
    "success": true,
    "count": 5,
    "questions": [...]
  }
}
```

---

### 13. Get Questions by Session
**GET** `/api/v1/question/session/:sessionId`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Questions retrieved successfully",
  "count": 5,
  "data": {
    "questions": [
      {
        "_id": "65fa111222333444555666",
        "session": "65f9876543210fedcba98765",
        "question": "What is Node.js and why is it used?",
        "answer": "Node.js is a JavaScript runtime...",
        "isPinned": false,
        "difficulty": "medium",
        "category": "",
        "createdAt": "2024-03-15T11:30:00.000Z"
      }
    ]
  }
}
```

---

### 14. Get Single Question
**GET** `/api/v1/question/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Question retrieved successfully",
  "data": {
    "question": {
      "_id": "65fa111222333444555666",
      "question": "What is Node.js?",
      "answer": "Node.js is...",
      "isPinned": false,
      "difficulty": "medium"
    }
  }
}
```

---

### 15. Search Questions
**GET** `/api/v1/question/search?q=node&limit=20`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Query Parameters:**
- `q` (required): Search term
- `limit` (optional): Max results (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "count": 3,
  "data": {
    "questions": [...],
    "searchQuery": "node"
  }
}
```

---

### 16. Get Pinned Questions
**GET** `/api/v1/question/session/:sessionId/pinned`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Pinned questions retrieved successfully",
  "count": 2,
  "data": {
    "questions": [...]
  }
}
```

---

### 17. Get Question Statistics
**GET** `/api/v1/question/session/:sessionId/stats`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 10,
      "pinned": 3,
      "unpinned": 7
    },
    "session": {
      "role": "Backend Developer",
      "experience": "mid-level",
      "topics": ["Node.js", "MongoDB"]
    }
  }
}
```

---

### 18. Add Custom Question
**POST** `/api/v1/question/custom`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "sessionId": "65f9876543210fedcba98765",
  "question": "What is the difference between SQL and NoSQL?",
  "answer": "SQL databases are relational..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom question added successfully",
  "data": {
    "question": {...}
  }
}
```

---

### 19. Update Question
**PUT** `/api/v1/question/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "question": "Updated question text",
  "answer": "Updated answer text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    "question": {...}
  }
}
```

---

### 20. Toggle Pin Question
**PATCH** `/api/v1/question/:id/toggle-pin`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Question pinned successfully",
  "data": {
    "isPinned": true,
    "question": {...}
  }
}
```

---

### 21. Regenerate Question
**POST** `/api/v1/question/:id/regenerate`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Question regenerated successfully",
  "data": {
    "question": {...}
  }
}
```

---

### 22. Delete Question
**DELETE** `/api/v1/question/:id`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Question deleted successfully",
  "data": {
    "deletedId": "65fa111222333444555666"
  }
}
```

---

## 📤 Export Management

### 23. Export Questions (PDF/CSV/DOCX)
**POST** `/api/v1/export/export/:sessionId?format=pdf`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Query Parameters:**
- `format` (required): `pdf`, `csv`, or `docx`

**Example:** `/api/v1/export/export/65f9876543210fedcba98765?format=pdf`

**Response:**
```json
{
  "success": true,
  "message": "Export queued successfully",
  "jobId": "67890",
  "checkStatusUrl": "/api/v1/export/status/67890"
}
```

---

### 24. Check Export Status
**GET** `/api/v1/export/status/:jobId`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response (Completed):**
```json
{
  "success": true,
  "status": "completed",
  "downloadUrl": "/api/v1/export/download/questions_65f9876543210fedcba98765_1710504000000.pdf"
}
```

---

### 25. Download Export File
**GET** `/api/v1/export/download/:filename`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:** File download

---

## 📊 Analytics

### 26. Get User Analytics
**GET** `/api/v1/analytics/user`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User analytics retrieved successfully",
  "data": {
    "totalSessions": 15,
    "totalQuestions": 75,
    "pinnedQuestions": 12,
    "averageQuestionsPerSession": 5,
    "recentSessions": [...]
  }
}
```

---

### 27. Get Session Analytics
**GET** `/api/v1/analytics/session/:sessionId`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session analytics retrieved successfully",
  "data": {
    "sessionId": "65f9876543210fedcba98765",
    "totalQuestions": 10,
    "pinnedQuestions": 3,
    "difficultyBreakdown": {
      "easy": 2,
      "medium": 6,
      "hard": 2
    },
    "avgAnswerLength": 450,
    "topics": ["Node.js", "MongoDB"],
    "role": "Backend Developer",
    "experience": "mid-level"
  }
}
```

---

### 28. Get Trending Topics
**GET** `/api/v1/analytics/trending?limit=10`

**Query Parameters:**
- `limit` (optional): Number of topics (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Trending topics retrieved successfully",
  "count": 10,
  "data": {
    "topics": [
      { "topic": "node.js", "count": 45 },
      { "topic": "react", "count": 38 },
      { "topic": "mongodb", "count": 32 }
    ]
  }
}
```

---

## 🔔 Notifications

### 29. Get Notifications
**GET** `/api/v1/notifications?limit=20`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "count": 5,
  "data": {
    "notifications": [
      {
        "id": "notif_1710504000000_abc123",
        "type": "job_complete",
        "jobType": "question-generation",
        "jobId": "12345",
        "message": "Your question-generation job has completed successfully",
        "timestamp": 1710504000000
      }
    ]
  }
}
```

---

### 30. Mark Notifications as Read
**POST** `/api/v1/notifications/read`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "notificationIds": ["notif_1710504000000_abc123", "notif_1710504100000_def456"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications marked as read"
}
```

---

### 31. Clear All Notifications
**DELETE** `/api/v1/notifications/clear`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications cleared"
}
```

---

## 🔄 Bulk Operations

### 32. Bulk Delete Questions
**POST** `/api/v1/bulk/delete`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667",
    "65fa111222333444555668"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 3 questions",
  "deletedCount": 3
}
```

---

### 33. Bulk Update Difficulty
**POST** `/api/v1/bulk/difficulty`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667"
  ],
  "difficulty": "hard"
}
```

**Valid Difficulty Values:**
- `easy`
- `medium`
- `hard`

**Response:**
```json
{
  "success": true,
  "message": "Successfully updated 2 questions",
  "modifiedCount": 2
}
```

---

### 34. Bulk Toggle Pin
**POST** `/api/v1/bulk/toggle-pin`

**Headers:**
```
Cookie: token=<your_jwt_token>
```

**Body (JSON):**
```json
{
  "questionIds": [
    "65fa111222333444555666",
    "65fa111222333444555667"
  ],
  "isPinned": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully pinned 2 questions",
  "modifiedCount": 2
}
```

---

## 🏥 Health Check

### 35. Health Check
**GET** `/health`

**Response:**
```json
{
  "success": true,
  "status": "OK",
  "uptime": 3600,
  "timestamp": "2024-03-15T12:00:00.000Z",
  "environment": "production",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```

---

## 📝 Notes

1. **Authentication**: Most endpoints require authentication via JWT token in cookies
2. **Rate Limiting**: 
   - General API: 100 requests per 15 minutes
   - AI Generation: 20 requests per hour
   - Auth endpoints: 10 requests per 15 minutes
3. **Async Operations**: Question generation and exports are async - use job IDs to check status
4. **Caching**: AI-generated questions are cached for 1 hour based on role, experience, and topics
5. **File Cleanup**: Export files are automatically deleted after download

---

## 🔧 Environment Setup

Make sure your `.env` file is configured:
```env
PORT=8000
NODE_ENV=production
MONGO_URI=mongodb://admin:password@mongodb:27017/intervai_db?authSource=admin
JWT_SECRET=your-secret-key
GROQ_API_KEY=your-groq-api-key
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123
CLIENT_URL=http://localhost:3000
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

---

## 📚 Additional Resources

- API Documentation: `http://localhost:8000/`
- Health Check: `http://localhost:8000/health`
- MongoDB: `mongodb://localhost:27017`
- Redis: `localhost:6379`
