# Password Reset Feature - Setup Guide

## ✅ Implementation Complete!

The password reset feature has been successfully implemented with OTP (One-Time Password) verification via email.

---

## 📋 What Was Added

### New Files Created
1. **`services/otpService.js`** - OTP generation, storage, and validation
2. **`services/emailService.js`** - Email sending with beautiful HTML templates
3. **`PASSWORD_RESET_SETUP.md`** - This setup guide

### Files Modified
1. **`controllers/userController.js`** - Added 3 new functions:
   - `forgotPassword` - Request OTP
   - `verifyOTP` - Verify OTP
   - `resetPassword` - Reset password with OTP

2. **`routes/user.routes.js`** - Added 3 new routes:
   - `POST /api/v1/user/forgot-password`
   - `POST /api/v1/user/verify-otp`
   - `POST /api/v1/user/reset-password`

3. **`.env.example`** - Added email and OTP configuration variables

4. **`package.json`** - Added `nodemailer` dependency

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

This will install the new `nodemailer` package.

### Step 2: Configure Email Service

Choose ONE of the following email services:

#### Option A: Gmail (Easiest for Testing)
```env
# Add to your .env file
EMAIL_SERVICE=gmail
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=IntervAI Support
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Create app password for "Mail"
5. Copy the 16-character password

#### Option B: SendGrid (Best for Production)
```env
# Add to your .env file
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=IntervAI Support
SENDGRID_API_KEY=your-sendgrid-api-key
```

**How to get SendGrid API Key:**
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Go to Settings > API Keys
3. Create API Key with "Mail Send" permission
4. Copy the API key

#### Option C: Custom SMTP
```env
# Add to your .env file
EMAIL_SERVICE=smtp
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=IntervAI Support
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### Step 3: Add OTP Configuration
```env
# Add to your .env file
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MAX=3
PASSWORD_MIN_LENGTH=6
```

### Step 4: Add Redis Password (CRITICAL!)
```env
# Add to your .env file
REDIS_PASSWORD=your-secure-redis-password
```

Then update `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
```

### Step 5: Restart Services
```bash
# Stop services
docker-compose down

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api
```

---

## 🧪 Testing the Feature

### Test 1: Request OTP
```bash
curl -X POST http://localhost:8000/api/v1/user/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If the email exists, an OTP has been sent",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

**Check your email** - You should receive an OTP like: `123456`

### Test 2: Verify OTP in Redis
```bash
# Connect to Redis
docker exec -it intervai-redis redis-cli

# Authenticate (if password set)
> AUTH your-redis-password

# Check OTP
> GET otp:your-test-email@gmail.com
"123456"

# Check TTL (time remaining)
> TTL otp:your-test-email@gmail.com
589

# Exit
> exit
```

### Test 3: Verify OTP via API
```bash
curl -X POST http://localhost:8000/api/v1/user/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com","otp":"123456"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "expiresIn": "9 minutes"
  }
}
```

### Test 4: Reset Password
```bash
curl -X POST http://localhost:8000/api/v1/user/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-test-email@gmail.com",
    "otp":"123456",
    "newPassword":"NewPassword123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password"
}
```

**Check your email** - You should receive a password change confirmation.

### Test 5: Login with New Password
```bash
curl -X POST http://localhost:8000/api/v1/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-test-email@gmail.com",
    "password":"NewPassword123!"
  }' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Welcome back, Your Name",
  "data": {
    "user": { ... }
  }
}
```

---

## 🔒 Security Features

### Rate Limiting
- **OTP Requests**: Max 3 per hour per email
- **OTP Verification**: Max 3 attempts per OTP
- **Automatic Lockout**: After max attempts, OTP is deleted

### Email Enumeration Prevention
- Always returns success message, even if email doesn't exist
- Prevents attackers from discovering valid email addresses

### OTP Security
- 6-digit random numeric code
- 10-minute expiry (configurable)
- Stored in Redis with automatic expiry
- Deleted after successful password reset
- Deleted after max verification attempts

### Password Security
- Cannot reuse old password
- Minimum length validation (default 6 chars)
- Hashed with bcrypt (10 rounds)

### Audit Trail
- All operations logged to console
- Includes email, attempts, and timestamps
- Can be extended to database logging

---

## 📊 API Endpoints Reference

### 1. Forgot Password (Request OTP)
**Endpoint:** `POST /api/v1/user/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, an OTP has been sent",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

**Error Responses:**
- `400` - Email is required / Invalid email format
- `429` - Too many OTP requests (max 3/hour)
- `500` - Failed to send email / Internal server error

---

### 2. Verify OTP
**Endpoint:** `POST /api/v1/user/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "expiresIn": "8 minutes"
  }
}
```

**Error Responses:**
- `400` - Email and OTP required / Invalid email / Invalid or expired OTP
- `429` - Too many verification attempts (max 3)
- `500` - Internal server error

---

### 3. Reset Password
**Endpoint:** `POST /api/v1/user/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password"
}
```

**Error Responses:**
- `400` - Missing fields / Invalid email / Password too short / Invalid OTP / Same as old password
- `404` - User not found
- `500` - Internal server error

---

## 🎨 Email Templates

### OTP Email
Beautiful HTML email with:
- Gradient header
- Large, centered OTP code
- Security warnings
- 10-minute expiry notice
- Professional footer

### Password Change Confirmation
Success email with:
- Green success banner
- Change timestamp
- Security alert if not authorized
- Support contact information

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_SERVICE` | `smtp` | Email provider: `sendgrid`, `gmail`, or `smtp` |
| `EMAIL_FROM` | `noreply@intervai.com` | Sender email address |
| `EMAIL_FROM_NAME` | `IntervAI Support` | Sender display name |
| `SENDGRID_API_KEY` | - | SendGrid API key (if using SendGrid) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASS` | - | SMTP password |
| `OTP_EXPIRY_MINUTES` | `10` | OTP validity period |
| `OTP_LENGTH` | `6` | OTP digit length |
| `OTP_MAX_ATTEMPTS` | `3` | Max OTP verification attempts |
| `OTP_RATE_LIMIT_MAX` | `3` | Max OTP requests per hour |
| `PASSWORD_MIN_LENGTH` | `6` | Minimum password length |
| `REDIS_PASSWORD` | - | Redis authentication password |

---

## 🐛 Troubleshooting

### Issue: Email not sending

**Check 1: Email service configured?**
```bash
# Check .env file
cat .env | grep EMAIL
```

**Check 2: SMTP credentials correct?**
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email', pass: 'your-password' }
});
transporter.verify().then(console.log).catch(console.error);
"
```

**Check 3: Gmail app password?**
- Must use app-specific password, not regular password
- 2FA must be enabled

---

### Issue: OTP not found in Redis

**Check 1: Redis connected?**
```bash
docker exec -it intervai-redis redis-cli
> PING
PONG
```

**Check 2: OTP stored?**
```bash
> KEYS otp:*
1) "otp:user@example.com"
```

**Check 3: OTP expired?**
```bash
> TTL otp:user@example.com
-2  # Expired or doesn't exist
589 # Seconds remaining
```

---

### Issue: Rate limit hit

**Check attempts:**
```bash
docker exec -it intervai-redis redis-cli
> GET otp:attempts:user@example.com
"4"
```

**Reset attempts:**
```bash
> DEL otp:attempts:user@example.com
> DEL otp:verify:user@example.com
```

---

### Issue: Redis password error

**Error:** `NOAUTH Authentication required`

**Fix:** Add password to .env
```env
REDIS_PASSWORD=your-password
```

**Restart services:**
```bash
docker-compose down
docker-compose up -d
```

---

## 📈 Monitoring

### Redis Keys to Monitor
```bash
# View all OTP keys
KEYS otp:*

# View all attempt tracking
KEYS otp:attempts:*

# View all verification tracking
KEYS otp:verify:*

# Count active OTPs
KEYS otp:* | wc -l
```

### Logs to Monitor
```bash
# API logs
docker-compose logs -f api | grep OTP

# Email logs
docker-compose logs -f api | grep Email

# Error logs
docker-compose logs -f api | grep Error
```

---

## 🎯 Next Steps

### Recommended Enhancements
1. **Email Verification on Registration**
   - Send verification email when user registers
   - Mark account as unverified until confirmed

2. **Security Audit Logging**
   - Log all password reset attempts to database
   - Track IP addresses and user agents
   - Create admin dashboard for security events

3. **Account Lockout**
   - Lock account after 5 failed login attempts
   - Auto-unlock after 15 minutes
   - Send email notification on lockout

4. **Password Strength Validation**
   - Require uppercase + lowercase
   - Require numbers + special characters
   - Check against common passwords list

5. **Two-Factor Authentication**
   - Optional 2FA with authenticator apps
   - Backup codes for account recovery

---

## 📚 Additional Resources

### Documentation
- [Nodemailer Docs](https://nodemailer.com/)
- [SendGrid API Docs](https://docs.sendgrid.com/)
- [Redis Commands](https://redis.io/commands/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

### Testing Tools
- [Mailtrap](https://mailtrap.io/) - Email testing service
- [MailHog](https://github.com/mailhog/MailHog) - Local email testing
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis GUI

---

## ✅ Checklist

### Setup
- [ ] Install dependencies (`npm install`)
- [ ] Configure email service in .env
- [ ] Add OTP configuration to .env
- [ ] Add Redis password to .env
- [ ] Update docker-compose.yml with Redis password
- [ ] Restart services

### Testing
- [ ] Request OTP via API
- [ ] Receive OTP email
- [ ] Verify OTP in Redis
- [ ] Verify OTP via API
- [ ] Reset password via API
- [ ] Receive confirmation email
- [ ] Login with new password

### Production
- [ ] Use production email service (SendGrid/SES)
- [ ] Set strong Redis password
- [ ] Configure proper email domain
- [ ] Set up email monitoring
- [ ] Configure rate limiting
- [ ] Set up error tracking
- [ ] Test all error scenarios

---

**Implementation Complete! 🎉**

The password reset feature is now fully functional and ready to use. Follow the setup steps above to configure your email service and start testing.

For questions or issues, refer to the troubleshooting section or check the detailed review documents in `.kiro/specs/interview-prep-api-enhancements/`.
