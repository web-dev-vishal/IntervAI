# Password Reset - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Email (Choose One)

**Gmail (Easiest):**
```env
EMAIL_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```
Get app password: https://myaccount.google.com/apppasswords

**SendGrid (Production):**
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-key
EMAIL_FROM=noreply@yourdomain.com
```
Get API key: https://app.sendgrid.com/settings/api_keys

### 3. Add to .env
```env
# Email Config (from step 2)
EMAIL_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=IntervAI Support

# OTP Config
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MAX=3

# Redis Password (IMPORTANT!)
REDIS_PASSWORD=your-secure-password
```

### 4. Restart
```bash
docker-compose down
docker-compose up -d
```

---

## 🧪 Test It

### Request OTP
```bash
curl -X POST http://localhost:8000/api/v1/user/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Check Email
Look for OTP code like: `123456`

### Reset Password
```bash
curl -X POST http://localhost:8000/api/v1/user/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "otp":"123456",
    "newPassword":"NewPass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"NewPass123!"}'
```

---

## 📋 New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/forgot-password` | Request OTP |
| POST | `/api/v1/user/verify-otp` | Verify OTP |
| POST | `/api/v1/user/reset-password` | Reset password |

---

## 🔍 Debug

### Check OTP in Redis
```bash
docker exec -it intervai-redis redis-cli
> AUTH your-password
> GET otp:test@example.com
"123456"
```

### Check Logs
```bash
docker-compose logs -f api | grep OTP
```

---

## ✅ Done!

Password reset is now working. See `PASSWORD_RESET_SETUP.md` for detailed documentation.
