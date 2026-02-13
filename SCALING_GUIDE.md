# 📈 Scaling Guide - Interview Prep API

## Current Architecture (Single Instance)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────┐     ┌─────────────┐
│   API       │────▶│  MongoDB    │
│  (1 inst)   │     │   Atlas     │
└──────┬──────┘     └─────────────┘
       │
       ├────▶ Redis Cloud
       │
┌──────▼──────┐
│   Worker    │
│  (1 inst)   │
└─────────────┘
```

## Scaling Stages

### Stage 1: Free Tier (0-1000 users)
**Current Setup**
- 1 API instance (512 MB RAM)
- 1 Worker instance (512 MB RAM)
- MongoDB Atlas Free (512 MB)
- Redis Cloud Free (30 MB)

**Capacity:**
- ~100 requests/minute
- ~1000 questions/day
- ~100 exports/day

**Cost:** $0/month

---

### Stage 2: Starter (1K-10K users)
**Upgrades Needed:**
- 2 API instances (1 GB RAM each)
- 2 Worker instances (1 GB RAM each)
- MongoDB Atlas M10 (2 GB)
- Redis Cloud 250 MB

**Capacity:**
- ~500 requests/minute
- ~10,000 questions/day
- ~1,000 exports/day

**Cost:** ~$50-70/month

**Implementation:**
```yaml
# render.yaml
services:
  - type: web
    name: intervai-api
    plan: standard
    scaling:
      minInstances: 2
      maxInstances: 4
```

---

### Stage 3: Growth (10K-100K users)
**Upgrades Needed:**
- 5 API instances (2 GB RAM each)
- 5 Worker instances (2 GB RAM each)
- MongoDB Atlas M30 (8 GB)
- Redis Cloud 1 GB
- CDN for static assets
- Load balancer

**Capacity:**
- ~2,000 requests/minute
- ~50,000 questions/day
- ~5,000 exports/day

**Cost:** ~$300-400/month

---

### Stage 4: Scale (100K+ users)
**Upgrades Needed:**
- 10+ API instances (4 GB RAM each)
- 10+ Worker instances (4 GB RAM each)
- MongoDB Atlas M60+ (16 GB+)
- Redis Cluster (5 GB+)
- CDN + Edge caching
- Database read replicas
- Dedicated load balancer

**Capacity:**
- ~10,000 requests/minute
- ~500,000 questions/day
- ~50,000 exports/day

**Cost:** ~$1,500-2,000/month

---

## Horizontal Scaling

### API Instances

**Render Configuration:**
```yaml
services:
  - type: web
    name: intervai-api
    plan: standard
    scaling:
      minInstances: 2
      maxInstances: 10
      targetCPUPercent: 70
      targetMemoryPercent: 80
```

**Benefits:**
- Automatic load balancing
- Zero-downtime deployments
- Better fault tolerance
- Higher throughput

**Considerations:**
- Stateless design (already implemented)
- Session storage in Redis (already implemented)
- No local file storage (use S3 for exports)

### Worker Instances

**Multiple Workers:**
```yaml
services:
  - type: worker
    name: intervai-worker
    plan: standard
    numInstances: 3
```

**Benefits:**
- Parallel job processing
- Faster queue processing
- Better resource utilization

**Queue Configuration:**
```javascript
// config/queue.js
export const questionQueue = new Queue('question-generation', {
    redis: REDIS_CONFIG,
    settings: {
        maxStalledCount: 3,
        stalledInterval: 30000
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

// Process with concurrency
questionQueue.process(10, async (job) => {
    // Process job
});
```

---

## Vertical Scaling

### Render Plans

| Plan | RAM | CPU | Price/month |
|------|-----|-----|-------------|
| Starter | 512 MB | 0.5 | $7 |
| Standard | 2 GB | 1 | $25 |
| Pro | 4 GB | 2 | $85 |
| Pro Plus | 8 GB | 4 | $175 |

### When to Upgrade

**Upgrade if:**
- CPU usage > 80% consistently
- Memory usage > 85% consistently
- Response times > 500ms
- Queue backlog growing
- Error rate increasing

---

## Database Scaling

### MongoDB Atlas Tiers

| Tier | RAM | Storage | Price/month |
|------|-----|---------|-------------|
| M0 (Free) | 512 MB | 512 MB | $0 |
| M10 | 2 GB | 10 GB | $57 |
| M20 | 4 GB | 20 GB | $116 |
| M30 | 8 GB | 40 GB | $232 |
| M40 | 16 GB | 80 GB | $464 |

### Optimization Strategies

**1. Indexes**
```javascript
// Already implemented
sessionSchema.index({ user: 1, createdAt: -1 });
sessionSchema.index({ user: 1, status: 1 });
questionSchema.index({ session: 1, isPinned: -1, createdAt: -1 });
```

**2. Read Replicas**
```javascript
// For read-heavy operations
const readConnection = mongoose.createConnection(MONGO_READ_URI, {
    readPreference: 'secondaryPreferred'
});
```

**3. Sharding** (100K+ users)
```javascript
// Shard by userId
sh.shardCollection("intervai_db.sessions", { user: 1 });
sh.shardCollection("intervai_db.questions", { session: 1 });
```

---

## Redis Scaling

### Redis Cloud Tiers

| Plan | Memory | Price/month |
|------|--------|-------------|
| Free | 30 MB | $0 |
| 250 MB | 250 MB | $7 |
| 1 GB | 1 GB | $15 |
| 5 GB | 5 GB | $60 |

### Redis Cluster (High Scale)

```javascript
// config/redis.js
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
    { host: 'node1.redis.com', port: 6379 },
    { host: 'node2.redis.com', port: 6379 },
    { host: 'node3.redis.com', port: 6379 }
], {
    redisOptions: {
        password: process.env.REDIS_PASSWORD
    }
});
```

### Cache Optimization

**1. Increase TTL for stable data**
```javascript
// services/cacheService.js
const CACHE_TTL = 3600; // 1 hour → 24 hours for stable data
```

**2. Cache more aggressively**
```javascript
// Cache user profiles
static async getUserProfile(userId) {
    const cached = await CacheService.get(`user:${userId}`);
    if (cached) return cached;
    
    const user = await User.findById(userId);
    await CacheService.set(`user:${userId}`, user, 3600);
    return user;
}
```

---

## CDN & Edge Caching

### Cloudflare Setup

**Benefits:**
- Reduced latency
- DDoS protection
- SSL/TLS
- Caching static responses

**Configuration:**
```javascript
// Add cache headers
app.get('/api/v1/analytics/trending', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    // ... response
});
```

---

## Load Balancing

### Render (Automatic)
- Automatic load balancing
- Health checks
- Zero-downtime deployments

### Custom Load Balancer (Advanced)

**Nginx Configuration:**
```nginx
upstream api_backend {
    least_conn;
    server api1.render.com:443;
    server api2.render.com:443;
    server api3.render.com:443;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass https://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## File Storage Scaling

### Current: Local Storage
```javascript
// exports/ folder
```

### Scaled: S3/Cloud Storage

**AWS S3 Integration:**
```javascript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

// Upload to S3
await s3.upload({
    Bucket: 'intervai-exports',
    Key: filename,
    Body: fileBuffer
}).promise();

// Generate signed URL
const url = s3.getSignedUrl('getObject', {
    Bucket: 'intervai-exports',
    Key: filename,
    Expires: 3600 // 1 hour
});
```

---

## Monitoring & Alerts

### Metrics to Track

**API Metrics:**
- Request rate (req/min)
- Response time (p50, p95, p99)
- Error rate (%)
- CPU usage (%)
- Memory usage (%)

**Worker Metrics:**
- Jobs processed/min
- Job success rate (%)
- Queue length
- Processing time (avg)

**Database Metrics:**
- Connection count
- Query time (avg)
- Slow queries
- Storage usage (%)

### Alert Thresholds

```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    action: email, slack
    
  - name: High Response Time
    condition: p95_response_time > 1000ms
    action: email
    
  - name: Queue Backlog
    condition: queue_length > 1000
    action: email, scale_workers
    
  - name: High CPU
    condition: cpu_usage > 85%
    action: email, scale_up
```

---

## Cost Optimization

### 1. Right-Size Instances
- Monitor actual usage
- Scale down during off-peak
- Use auto-scaling

### 2. Optimize Database
- Remove unused indexes
- Archive old data
- Use compression

### 3. Optimize Redis
- Set appropriate TTLs
- Remove unused keys
- Use compression

### 4. Optimize AI Calls
- Increase cache hit rate
- Batch requests
- Use cheaper models when possible

---

## Scaling Checklist

### Before Scaling
- [ ] Monitor current metrics
- [ ] Identify bottlenecks
- [ ] Estimate new capacity needs
- [ ] Calculate costs
- [ ] Plan rollback strategy

### During Scaling
- [ ] Scale one component at a time
- [ ] Monitor metrics closely
- [ ] Test thoroughly
- [ ] Document changes

### After Scaling
- [ ] Verify performance improvement
- [ ] Check error rates
- [ ] Monitor costs
- [ ] Update documentation

---

## Emergency Scaling

### Sudden Traffic Spike

**Immediate Actions:**
1. Scale API instances (2x)
2. Scale worker instances (2x)
3. Increase Redis memory
4. Enable aggressive caching
5. Add rate limiting

**Render Quick Scale:**
```bash
# Via Render Dashboard
1. Go to service
2. Click "Scale"
3. Increase instances
4. Click "Save"
```

---

## Future Considerations

### Microservices Architecture
```
┌─────────────┐
│   Gateway   │
└──────┬──────┘
       │
   ┌───┴───┬───────┬────────┐
   │       │       │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│Auth │ │User │ │Q&A  │ │Exp  │
│Svc  │ │Svc  │ │Svc  │ │Svc  │
└─────┘ └─────┘ └─────┘ └─────┘
```

### Event-Driven Architecture
- Apache Kafka for events
- Event sourcing
- CQRS pattern

### Global Distribution
- Multi-region deployment
- Edge computing
- Data replication

---

**Ready to scale! 📈**
