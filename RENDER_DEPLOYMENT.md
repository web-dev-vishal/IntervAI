# 🚀 Render Deployment Guide

## Prerequisites

Before deploying to Render, you need:

1. **Render Account** - [Sign up free](https://render.com)
2. **MongoDB Atlas** - [Free tier available](https://www.mongodb.com/cloud/atlas)
3. **Redis Cloud** - [Free tier available](https://redis.com/try-free/) or [Upstash](https://upstash.com)
4. **Groq API Key** - [Get free key](https://console.groq.com)
5. **GitHub Repository** - Push your code to GitHub

## Step 1: Setup External Services

### 1.1 MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for Render access
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/intervai_db?retryWrites=true&w=majority
   ```

### 1.2 Redis Cloud Setup

**Option A: Redis Cloud**
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create free database
3. Get connection details:
   - Host: `redis-xxxxx.cloud.redislabs.com`
   - Port: `xxxxx`
   - Password: `your-password`

**Option B: Upstash (Recommended for Render)**
1. Go to [Upstash](https://upstash.com)
2. Create Redis database
3. Get connection details from dashboard

### 1.3 Groq API Key
1. Go to [Groq Console](https://console.groq.com)
2. Create API key
3. Copy the key (starts with `gsk_`)

## Step 2: Deploy to Render

### Method 1: Using render.yaml (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment config"
   git push origin main
   ```

2. **Create New Blueprint on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically

3. **Configure Environment Variables**
   
   For **intervai-api** service:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/intervai_db
   JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
   GROQ_API_KEY=gsk_your_groq_api_key_here
   REDIS_HOST=redis-xxxxx.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-redis-password
   CLIENT_URL=https://your-frontend-url.com
   ```
   
   For **intervai-worker** service:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/intervai_db
   GROQ_API_KEY=gsk_your_groq_api_key_here
   REDIS_HOST=redis-xxxxx.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-redis-password
   ```

4. **Deploy**
   - Click "Apply"
   - Wait for deployment (5-10 minutes)
   - Your API will be available at: `https://intervai-api.onrender.com`

### Method 2: Manual Deployment

#### Deploy API Service

1. **Create Web Service**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Configure:
     - Name: `intervai-api`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: `Starter` (free)

2. **Add Environment Variables** (same as above)

3. **Deploy**

#### Deploy Worker Service

1. **Create Background Worker**
   - Click "New" → "Background Worker"
   - Connect same repository
   - Configure:
     - Name: `intervai-worker`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `node worker.js`
     - Plan: `Starter` (free)

2. **Add Environment Variables** (same as above)

3. **Deploy**

## Step 3: Verify Deployment

### Check API Health
```bash
curl https://intervai-api.onrender.com/health
```

Expected response:
```json
{
  "success": true,
  "status": "OK",
  "uptime": 123,
  "timestamp": "2024-03-15T12:00:00.000Z",
  "environment": "production",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```

### Check API Info
```bash
curl https://intervai-api.onrender.com/
```

### Test Registration
```bash
curl -X POST https://intervai-api.onrender.com/api/v1/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Step 4: Monitor Deployment

### View Logs
1. Go to Render Dashboard
2. Click on your service
3. Go to "Logs" tab
4. Monitor real-time logs

### Check Metrics
1. Go to "Metrics" tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### Set Up Alerts
1. Go to "Settings" → "Notifications"
2. Add email for deployment notifications
3. Configure health check alerts

## Production Optimizations

### 1. Enable Auto-Deploy
- Go to service settings
- Enable "Auto-Deploy" for main branch
- Every push will trigger deployment

### 2. Configure Health Checks
Already configured in code:
- Path: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds

### 3. Set Up Custom Domain (Optional)
1. Go to service settings
2. Click "Custom Domain"
3. Add your domain
4. Update DNS records

### 4. Enable HTTPS
- Automatically enabled by Render
- Free SSL certificates

## Scaling on Render

### Vertical Scaling
Upgrade plan for more resources:
- **Starter**: 512 MB RAM, 0.5 CPU
- **Standard**: 2 GB RAM, 1 CPU
- **Pro**: 4 GB RAM, 2 CPU

### Horizontal Scaling
1. Go to service settings
2. Increase "Instance Count"
3. Load balancing is automatic

### Worker Scaling
1. Go to worker service
2. Increase instance count
3. Multiple workers process jobs in parallel

## Cost Optimization

### Free Tier Limits
- **Web Service**: 750 hours/month (1 instance)
- **Background Worker**: 750 hours/month (1 instance)
- **Bandwidth**: 100 GB/month

### Tips to Stay Free
1. Use free tier MongoDB Atlas (512 MB)
2. Use free tier Redis (30 MB)
3. Keep 1 API + 1 Worker instance
4. Monitor bandwidth usage

### Paid Plans (If Needed)
- **Starter**: $7/month per service
- **Standard**: $25/month per service
- **Pro**: $85/month per service

## Troubleshooting

### Issue: Service Won't Start
**Check:**
1. Build logs for errors
2. Environment variables are set
3. MongoDB connection string is correct
4. Redis credentials are correct

### Issue: Worker Not Processing Jobs
**Check:**
1. Worker service is running
2. Redis connection is working
3. Worker logs for errors

### Issue: Slow Response Times
**Solutions:**
1. Upgrade to paid plan
2. Enable Redis caching
3. Optimize database queries
4. Add database indexes

### Issue: Database Connection Timeout
**Solutions:**
1. Whitelist 0.0.0.0/0 in MongoDB Atlas
2. Check connection string format
3. Verify database user permissions

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| NODE_ENV | Yes | Environment | `production` |
| PORT | Auto | Server port | `8000` (auto-set by Render) |
| MONGO_URI | Yes | MongoDB connection | `mongodb+srv://...` |
| JWT_SECRET | Yes | JWT secret key | 32+ random characters |
| GROQ_API_KEY | Yes | Groq API key | `gsk_...` |
| REDIS_HOST | Yes | Redis host | `redis-xxx.cloud.redislabs.com` |
| REDIS_PORT | Yes | Redis port | `12345` |
| REDIS_PASSWORD | Yes | Redis password | Your Redis password |
| CLIENT_URL | Yes | Frontend URL | `https://yourapp.com` |

## Post-Deployment Checklist

- [ ] API health check returns OK
- [ ] User registration works
- [ ] User login works
- [ ] Session creation works
- [ ] Question generation works
- [ ] Worker processes jobs
- [ ] Exports work
- [ ] Analytics work
- [ ] Notifications work
- [ ] All endpoints respond correctly
- [ ] Logs show no errors
- [ ] Database connection stable
- [ ] Redis connection stable

## Continuous Deployment

### Automatic Deployment
1. Push to main branch
2. Render automatically builds and deploys
3. Zero-downtime deployment

### Manual Deployment
1. Go to Render Dashboard
2. Click "Manual Deploy"
3. Select branch
4. Click "Deploy"

## Monitoring & Maintenance

### Daily Checks
- [ ] Check service status
- [ ] Review error logs
- [ ] Monitor response times
- [ ] Check database usage

### Weekly Checks
- [ ] Review analytics
- [ ] Check bandwidth usage
- [ ] Update dependencies
- [ ] Review security alerts

### Monthly Checks
- [ ] Review costs
- [ ] Optimize performance
- [ ] Update documentation
- [ ] Backup database

## Backup Strategy

### MongoDB Backup
1. Use MongoDB Atlas automated backups
2. Configure backup schedule
3. Test restore process

### Redis Backup
1. Redis Cloud has automatic backups
2. Configure persistence settings
3. Export data periodically

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Render's secret management
   - Rotate keys regularly

2. **Database Security**
   - Use strong passwords
   - Enable IP whitelisting
   - Use SSL connections

3. **API Security**
   - Enable rate limiting (already configured)
   - Use HTTPS only
   - Validate all inputs

4. **Monitoring**
   - Set up error alerts
   - Monitor failed login attempts
   - Track API usage

## Support & Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Redis Cloud Docs**: https://docs.redis.com
- **Groq Docs**: https://console.groq.com/docs

## Next Steps

1. ✅ Deploy to Render
2. ✅ Test all endpoints
3. ✅ Set up monitoring
4. ✅ Configure alerts
5. ✅ Add custom domain (optional)
6. ✅ Set up CI/CD
7. ✅ Document API for frontend team

---

**Your API is now production-ready and deployed! 🚀**
