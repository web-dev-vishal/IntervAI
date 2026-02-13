# Password Reset Implementation - Quick Checklist

## 🚨 CRITICAL - Do First (15 minutes)

### ☐ Fix Redis Security
```bash
# 1. Add to .env
REDIS_PASSWORD=your-secure-password-here

# 2. Update docker-compose.yml
# Add under redis service:
command: redis-server --requirepass ${REDIS_PASSWORD}

# 3. Restart
docker-compose down && docker-compose up -d

# 4. Test
docker exec -it intervai-redis redis-cli
> AUTH your-password
> PING
```

---

## 📝 Environment Variables (10 minutes)

### ☐ Add to .env
```env
# Email Service
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@intervai.com
SENDGRID_API_KEY=your-key

# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MAX=3

# Redis Security
REDIS_PASSWORD=your-password
```

### ☐ Update .env.example
Copy all new variables with example values

---

## 💻 Code Implementation (2-3 days)

### ☐ Install Dependencies
```bash
npm install @sendgrid/mail nodemailer
```

### ☐ Create Services
- [ ] `services/otpService.js` - OTP generation/validation
- [ ] `services/emailService.js` - Email sending

### ☐ Update Controllers
- [ ] Add `forgotPassword` function
- [ ] Add `verifyOTP` function
- [ ] Add `resetPassword` function

### ☐ Update Routes
- [ ] `POST /api/v1/user/forgot-password`
- [ ] `POST /api/v1/user/verify-otp`
- [ ] `POST /api/v1/user/reset-password`

### ☐ Update Redis Config
- [ ] Add `storeOTP` helper
- [ ] Add `getOTP` helper
- [ ] Add `deleteOTP` helper
- [ ] Add `trackOTPRequest` helper

---

## 🧪 Testing (1 day)

### ☐ Manual Tests
- [ ] Request OTP (check email)
- [ ] Verify OTP in Redis
- [ ] Verify OTP via API
- [ ] Reset password
- [ ] Login with new password
- [ ] Test OTP expiry (wait 10 min)
- [ ] Test rate limiting (4+ requests)
- [ ] Test invalid OTP
- [ ] Test non-existent email

### ☐ Redis Verification
```bash
# Check OTP stored
GET otp:user@example.com

# Check TTL
TTL otp:user@example.com

# Check attempts
GET otp:attempts:user@example.com
```

---

## 📚 Documentation

### ☐ Update Files
- [ ] README.md - Add password reset endpoints
- [ ] POSTMAN_COLLECTION.md - Add new endpoints
- [ ] API documentation

---

## ✅ Verification Checklist

### Security
- [ ] Redis has password
- [ ] OTP expires after 10 minutes
- [ ] Rate limiting works (3/hour)
- [ ] Emails don't reveal if user exists
- [ ] OTP is deleted after use
- [ ] Password is hashed before storage

### Functionality
- [ ] User receives OTP email
- [ ] OTP verification works
- [ ] Password reset works
- [ ] Can login with new password
- [ ] Error messages are clear

### Performance
- [ ] OTP generation < 100ms
- [ ] Email sent < 30 seconds
- [ ] Redis operations < 50ms
- [ ] API response < 200ms

---

## 🎯 Success Criteria

**You're done when:**
1. ✅ Redis requires password
2. ✅ User can request OTP
3. ✅ OTP arrives in email
4. ✅ OTP can be verified
5. ✅ Password can be reset
6. ✅ User can login with new password
7. ✅ Rate limiting prevents abuse
8. ✅ All tests pass

---

## 📞 Quick Reference

### Redis Commands
```bash
# View OTP
GET otp:email@example.com

# View attempts
GET otp:attempts:email@example.com

# Delete OTP
DEL otp:email@example.com

# View all OTPs
KEYS otp:*
```

### API Endpoints
```bash
# Request OTP
POST /api/v1/user/forgot-password
Body: {"email": "user@example.com"}

# Verify OTP
POST /api/v1/user/verify-otp
Body: {"email": "user@example.com", "otp": "123456"}

# Reset Password
POST /api/v1/user/reset-password
Body: {"email": "user@example.com", "otp": "123456", "newPassword": "NewPass123!"}
```

---

**Print this checklist and check off items as you complete them!**
