# Coolify Quick Start Guide - Cascade

A streamlined guide for deploying Cascade on Coolify.

## Prerequisites Checklist

- [ ] Coolify instance running and accessible
- [ ] Supabase project created
- [ ] Supabase URL and anon key ready
- [ ] Git repository accessible (GitHub/GitLab/Gitea)

## 5-Minute Deployment

### Step 1: Create Application in Coolify

1. Log into Coolify dashboard
2. Navigate to your Project/Server
3. Click **"+ New"** → **"Application"**
4. Choose **"Public Repository"** or connect your Git provider

### Step 2: Repository Configuration

```
Repository URL: https://github.com/your-org/Cascade
Branch: main
Build Pack: Dockerfile
```

### Step 3: Environment Variables

Click **"Environment Variables"** and add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

### Step 4: Port Configuration

```
Port Mappings: 3000:3000
```

### Step 5: Deploy

1. Click **"Save"**
2. Click **"Deploy"**
3. Watch build logs for any errors
4. Access your application via the generated URL

## Post-Deployment

### Verify Deployment

```bash
# Check health endpoint
curl https://your-app.coolify.io/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-01T...","uptime":123.45,"environment":"production"}
```

### Enable Auto-Deploy

1. In Coolify, go to **"Git"** tab
2. Enable **"Automatic Deployment"**
3. Copy the webhook URL
4. Add webhook to your Git repository:
   - **GitHub**: Settings → Webhooks → Add webhook
   - **GitLab**: Settings → Webhooks → Add new webhook
   - **Payload URL**: Your Coolify webhook URL
   - **Content type**: `application/json`
   - **Events**: Push events

### Add Custom Domain

1. In Coolify, go to **"Domains"** tab
2. Click **"Add Domain"**
3. Enter your domain (e.g., `cascade.yourdomain.com`)
4. Coolify auto-generates SSL certificate via Let's Encrypt
5. Update your DNS:
   ```
   Type: A or CNAME
   Name: cascade (or @)
   Value: Your Coolify server IP or hostname
   ```

## Troubleshooting

### Build Fails

**Check build logs in Coolify:**

```
Common issues:
1. npm install fails → Check package.json syntax
2. SWC binary error → Dockerfile includes Alpine-compatible binary
3. Out of memory → Increase container memory limit
```

### App Won't Start

**Check application logs in Coolify:**

```
Common issues:
1. Missing env variables → Add to Environment Variables tab
2. Port conflict → Verify port 3000 is exposed
3. Supabase connection → Verify URL and key are correct
```

### Environment Variables Not Working

**Solution:**

1. Make sure all `NEXT_PUBLIC_*` variables are set in the Environment Variables section
2. Redeploy the application (environment variables are loaded at runtime)

## Advanced Configuration

### Resource Limits

In Coolify **"Advanced"** tab:

```yaml
Memory Limit: 1GB
Memory Reservation: 512MB
CPU Limit: 1 core
CPU Reservation: 0.25 cores
```

### Multiple Environments

Deploy separate instances for staging/production:

```
Production:
- Repository: main branch
- Domain: cascade.yourdomain.com
- Env: NEXT_PUBLIC_SUPABASE_URL=prod-url

Staging:
- Repository: develop branch
- Domain: staging-cascade.yourdomain.com
- Env: NEXT_PUBLIC_SUPABASE_URL=staging-url
```

## Monitoring

### Built-in Monitoring

Coolify provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Health**: Container health status

### External Monitoring

Consider integrating:
- **Uptime monitoring**: UptimeRobot, Better Uptime
- **Error tracking**: Sentry
- **APM**: New Relic, Datadog

## Security Checklist

- [x] HTTPS enabled (Coolify auto-SSL)
- [x] Environment variables not in code
- [x] Non-root user in container (UID 1001)
- [x] Minimal base image (Alpine Linux)
- [x] `no-new-privileges` security option
- [ ] Configure firewall rules on Coolify server
- [ ] Set up monitoring/alerts
- [ ] Regular dependency updates

## Getting Help

### Logs Location

```bash
# View application logs
docker logs <container-name>

# Follow logs in real-time
docker logs -f <container-name>

# View last 100 lines
docker logs --tail 100 <container-name>
```

### Common Commands

```bash
# Restart application
# (Use Coolify UI: Click "Restart")

# View container status
docker ps | grep cascade

# Access container shell
docker exec -it <container-name> sh

# Check environment variables
docker exec <container-name> printenv
```

### Support Resources

- **Coolify**: https://coolify.io/docs
- **Coolify Discord**: https://coollabs.io/discord
- **Cascade Docs**: See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- **Next.js**: https://nextjs.org/docs

## Quick Reference

### Essential URLs

```
Coolify Dashboard: https://your-coolify-instance.com
Application URL: https://cascade.your-domain.com
Health Check: https://cascade.your-domain.com/api/health
Supabase Dashboard: https://app.supabase.com
```

## Next Steps

After successful deployment:

1. **Test the application**: Create test user, submit request
2. **Configure Supabase RLS**: Ensure Row Level Security policies are active
3. **Set up monitoring**: Configure uptime checks
4. **Document credentials**: Store Supabase and Coolify credentials securely
5. **Train team**: Share access and deployment procedures

---

**Last Updated**: 2026-02-01
**Coolify Version**: Compatible with v4.x
**Cascade Version**: Latest
