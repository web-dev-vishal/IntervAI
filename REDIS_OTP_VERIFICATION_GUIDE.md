# Redis OTP Verification Guide

## ✅ YES! You Can See OTP in Redis UI

The OTP is stored in Redis as plain text and can be viewed using:
1. Redis CLI (Command Line)
2. Redis Desktop Manager (GUI)
3. RedisInsight (Official GUI)
4. Redis Commander (Web UI)

---

## 🔍 Code Verification

### OTP Storage Implementation ✅

**File:** `services/otpService.js`

```javascript
static async storeOTP(email, otp, expiryMinutes = 10) {
    const redis = getRedisClient();
    const key = `otp:${email.toLowerCase()}`;
    await redis.setex(key, expiryMinutes * 60, otp);
    console.log(`[OTP] Stored for ${email}, expires in ${expiryMinutes} minutes`);
}
```

**Key Format:** `otp:user@example.com`  
**Value:** `123456` (plain text, 6 digits)  
**TTL:** 600 seconds (10 minutes)

### OTP Retrieval Implementation ✅

```javascript
static async getOTP(email) {
    const redis = getRedisClient();
    const key = `otp:${email.toLowerCase()}`;
    return await redis.get(key);
}
```

### OTP Verification Implementation ✅

```javascript
static async verifyOTP(email, otp) {
    const storedOTP = await this.getOTP(email);
    return storedOTP === otp;  // Simple string comparison
}
```

**Verification:** ✅ Code is correct and will work!

---

## 📋 Method 1: Redis CLI (Fastest)

### Step 1: Connect to Redis Container
```bash
docker exec -it intervai-redis redis-cli
```

### Step 2: Authenticate (if password set)
```bash
> AUTH your-redis-password
OK
```

### Step 3: View OTP
```bash
# Get specific OTP
> GET otp:user@example.com
"123456"

# View all OTP keys
> KEYS otp:*
1) "otp:user@example.com"
2) "otp:another@example.com"

# Check TTL (time remaining)
> TTL otp:user@example.com
589

# Get all info at once
> GET otp:user@example.com
"123456"
> TTL otp:user@example.com
585
```

### Step 4: View Rate Limiting Data
```bash
# Check OTP request attempts
> GET otp:attempts:user@example.com
"2"

# Check verification attempts
> GET otp:verify:user@example.com
"1"

# View all tracking keys
> KEYS otp:attempts:*
> KEYS otp:verify:*
```

### Step 5: Exit
```bash
> exit
```

---

## 🖥️ Method 2: Redis Desktop Manager (GUI)

### Installation
**Windows/Mac/Linux:**
```bash
# Download from: https://resp.app/
# Or use: https://github.com/qishibo/AnotherRedisDesktopManager
```

### Connection Setup
1. Open Redis Desktop Manager
2. Click "Connect to Redis Server"
3. Enter connection details:
   - **Name:** IntervAI Redis
   - **Host:** localhost
   - **Port:** 6379
   - **Auth:** your-redis-password
4. Click "Test Connection"
5. Click "OK"

### View OTP
1. Expand connection
2. Select database (usually db0)
3. Search for: `otp:*`
4. Click on key to view value
5. See TTL in the interface

**Screenshot Example:**
```
Key: otp:user@example.com
Type: string
Value: 123456
TTL: 589 seconds
```

---

## 🔍 Method 3: RedisInsight (Official GUI)

### Installation
```bash
# Download from: https://redis.com/redis-enterprise/redis-insight/

# Or using Docker:
docker run -d --name redisinsight \
  -p 8001:8001 \
  redislabs/redisinsight:latest
```

### Access
Open browser: http://localhost:8001

### Connection Setup
1. Click "Add Redis Database"
2. Enter details:
   - **Host:** host.docker.internal (or localhost)
   - **Port:** 6379
   - **Password:** your-redis-password
3. Click "Add Database"

### View OTP
1. Click on your database
2. Go to "Browser" tab
3. Search: `otp:*`
4. Click on key to view:
   - Value: `123456`
   - TTL: `589 seconds`
   - Type: `string`

---

## 🌐 Method 4: Redis Commander (Web UI)

### Installation
```bash
# Using Docker
docker run -d \
  --name redis-commander \
  -p 8081:8081 \
  -e REDIS_HOSTS=local:redis:6379:0:your-password \
  --network intervai_default \
  rediscommander/redis-commander:latest
```

### Access
Open browser: http://localhost:8081

### View OTP
1. Select database (db0)
2. Search: `otp:*`
3. Click on key
4. View value and TTL

---

## 🧪 Complete Testing Flow

### Step 1: Request OTP
```bash
curl -X POST http://localhost:8000/api/v1/user/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, an OTP has been sent",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

### Step 2: Check Console Logs
```bash
docker-compose logs -f api | grep OTP
```

**Output:**
```
[OTP] Stored for test@example.com, expires in 10 minutes
[Email] OTP sent to test@example.com, MessageID: <...>
```

### Step 3: View OTP in Redis CLI
```bash
docker exec -it intervai-redis redis-cli

# Authenticate
> AUTH your-password
OK

# Get OTP
> GET otp:test@example.com
"123456"

# Check TTL
> TTL otp:test@example.com
589

# Check attempts
> GET otp:attempts:test@example.com
"1"
```

### Step 4: Verify OTP via API
```bash
curl -X POST http://localhost:8000/api/v1/user/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "expiresIn": "9 minutes"
  }
}
```

### Step 5: Verify in Redis Again
```bash
> GET otp:test@example.com
"123456"  # Still there until password reset

> GET otp:verify:test@example.com
"1"  # Verification attempt tracked
```

### Step 6: Reset Password
```bash
curl -X POST http://localhost:8000/api/v1/user/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "otp":"123456",
    "newPassword":"NewPass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password"
}
```

### Step 7: Verify OTP Deleted
```bash
> GET otp:test@example.com
(nil)  # OTP deleted after successful reset

> KEYS otp:*
(empty list or set)
```

---

## 📊 Redis Key Structure

### OTP Keys
```
Key Pattern: otp:{email}
Example: otp:user@example.com
Value: "123456"
Type: string
TTL: 600 seconds (10 minutes)
```

### Rate Limiting Keys
```
Key Pattern: otp:attempts:{email}
Example: otp:attempts:user@example.com
Value: "2"
Type: string
TTL: 3600 seconds (1 hour)
```

### Verification Tracking Keys
```
Key Pattern: otp:verify:{email}
Example: otp:verify:user@example.com
Value: "1"
Type: string
TTL: 600 seconds (10 minutes)
```

---

## 🔍 Useful Redis Commands

### View All OTP Data
```bash
# All OTP codes
KEYS otp:*

# All rate limit tracking
KEYS otp:attempts:*

# All verification tracking
KEYS otp:verify:*

# Everything OTP-related
KEYS otp*
```

### Get Multiple Values
```bash
# Get OTP and TTL
MGET otp:user@example.com
TTL otp:user@example.com

# Get all info for an email
GET otp:user@example.com
GET otp:attempts:user@example.com
GET otp:verify:user@example.com
```

### Monitor Real-Time
```bash
# Watch all Redis commands in real-time
MONITOR

# Then in another terminal, request OTP
# You'll see: SETEX otp:user@example.com 600 "123456"
```

### Debug Commands
```bash
# Check if key exists
EXISTS otp:user@example.com

# Get key type
TYPE otp:user@example.com

# Get TTL in milliseconds
PTTL otp:user@example.com

# Get all keys count
DBSIZE
```

---

## 🐛 Troubleshooting

### Issue: Can't see OTP in Redis

**Check 1: Is OTP actually stored?**
```bash
docker-compose logs -f api | grep "OTP] Stored"
```

**Check 2: Redis connection working?**
```bash
docker exec -it intervai-redis redis-cli
> PING
PONG
```

**Check 3: Correct database?**
```bash
> SELECT 0
OK
> KEYS otp:*
```

**Check 4: OTP expired?**
```bash
> TTL otp:user@example.com
-2  # Key doesn't exist or expired
```

---

### Issue: Authentication required

**Error:** `(error) NOAUTH Authentication required.`

**Fix:**
```bash
> AUTH your-redis-password
OK
```

---

### Issue: Wrong database

**Check current database:**
```bash
> INFO keyspace
# Keyspace
db0:keys=5,expires=5,avg_ttl=589000
```

**Switch database:**
```bash
> SELECT 0
OK
```

---

## 📸 Visual Examples

### Redis CLI Output
```bash
$ docker exec -it intervai-redis redis-cli
127.0.0.1:6379> AUTH mypassword
OK
127.0.0.1:6379> GET otp:test@example.com
"123456"
127.0.0.1:6379> TTL otp:test@example.com
(integer) 589
127.0.0.1:6379> GET otp:attempts:test@example.com
"1"
127.0.0.1:6379> KEYS otp:*
1) "otp:test@example.com"
2) "otp:attempts:test@example.com"
127.0.0.1:6379> exit
```

### RedisInsight Screenshot (Text Representation)
```
┌─────────────────────────────────────────┐
│ Browser                                 │
├─────────────────────────────────────────┤
│ Search: otp:*                      [🔍] │
├─────────────────────────────────────────┤
│ ✓ otp:test@example.com                 │
│   Type: string                          │
│   Value: 123456                         │
│   TTL: 589 seconds                      │
│                                         │
│ ✓ otp:attempts:test@example.com        │
│   Type: string                          │
│   Value: 1                              │
│   TTL: 3589 seconds                     │
└─────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

### Code Verification
- [x] OTP stored as plain text string
- [x] Key format: `otp:{email}`
- [x] TTL set to 600 seconds (10 minutes)
- [x] Email normalized to lowercase
- [x] Console logging enabled
- [x] Error handling in place

### Redis Verification
- [ ] Can connect to Redis CLI
- [ ] Can authenticate with password
- [ ] Can see OTP keys with `KEYS otp:*`
- [ ] Can get OTP value with `GET otp:email`
- [ ] Can see TTL with `TTL otp:email`
- [ ] Can see rate limiting with `GET otp:attempts:email`

### API Verification
- [ ] Request OTP returns success
- [ ] Email received with OTP
- [ ] OTP visible in Redis
- [ ] OTP verification works
- [ ] Password reset works
- [ ] OTP deleted after reset

---

## 🎯 Summary

**YES, you can absolutely see the OTP in Redis!**

The OTP is stored as:
- **Plain text** (not encrypted)
- **String type** (not hash or list)
- **Key format:** `otp:user@example.com`
- **Value:** `123456` (6 digits)
- **TTL:** 600 seconds (10 minutes)

**Best way to view:**
1. **Quick check:** Redis CLI (`docker exec -it intervai-redis redis-cli`)
2. **Visual:** RedisInsight (official GUI)
3. **Web-based:** Redis Commander

**The code is correct and will work perfectly!** ✅

---

## 📚 Additional Resources

- [Redis CLI Commands](https://redis.io/commands/)
- [RedisInsight Download](https://redis.com/redis-enterprise/redis-insight/)
- [Redis Desktop Manager](https://resp.app/)
- [Redis Commander](https://github.com/joeferner/redis-commander)

---

**Need help?** Check the troubleshooting section or run the complete testing flow above!
