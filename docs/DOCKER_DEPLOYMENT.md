# Docker Deployment Guide for Cascade

This guide covers deploying the Cascade application using Docker and Docker Compose, with specific instructions for Coolify deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Coolify Deployment](#coolify-deployment)
- [Environment Variables](#environment-variables)
- [Building the Docker Image](#building-the-docker-image)
- [Running with Docker Compose](#running-with-docker-compose)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Production Considerations](#production-considerations)

## Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher (for local development)
- Supabase project with URL and anon key
- Node.js 22+ (for local development only)

## Quick Start

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd Cascade

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
nano .env.local
```

### 2. Build and Run

```bash
# Build the Docker image
docker build -t cascade-app .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key \
  cascade-app
```

### 3. Access the Application

Open your browser to `http://localhost:3000`

## Coolify Deployment

Coolify is a self-hosted Heroku/Vercel/Netlify alternative. Here's how to deploy Cascade on Coolify:

### Step 1: Create New Resource

1. Log into your Coolify instance
2. Navigate to your server/project
3. Click "Add New Resource" → "Application"
4. Select "Docker Compose" or "Dockerfile"

### Step 2: Configure Git Repository

1. **Repository URL**: `https://github.com/your-org/Cascade`
2. **Branch**: `main` (or your production branch)
3. **Build Pack**: Select "Dockerfile"

### Step 3: Set Environment Variables

In Coolify's environment variables section, add:

#### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key-here

# Node Environment
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

#### Build Arguments

Set these as **Build Arguments** in Coolify:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key-here
```

### Step 4: Configure Ports

- **Internal Port**: `3000`
- **Public Port**: Your choice (Coolify will handle this)
- **Protocol**: HTTP

### Step 5: Health Check Configuration

Coolify should auto-detect the health check from the Dockerfile, but you can manually configure:

- **Path**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds

### Step 6: Deploy

1. Click "Save" to save your configuration
2. Click "Deploy" to start the deployment
3. Monitor the build logs for any errors
4. Once deployed, access your application via the provided URL

### Coolify-Specific Tips

- **Automatic Deployments**: Enable webhook in your Git repository for automatic deployments on push
- **SSL/TLS**: Coolify handles SSL certificates automatically via Let's Encrypt
- **Custom Domains**: Add your custom domain in the "Domains" section
- **Logs**: Access real-time logs via Coolify's dashboard
- **Resource Limits**: Set CPU and memory limits in the "Advanced" section

## Environment Variables

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Application port | `3000` |
| `HOSTNAME` | Bind hostname | `0.0.0.0` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

### Environment File Structure

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Override defaults
# NODE_ENV=production
# PORT=3000
# HOSTNAME=0.0.0.0
```

⚠️ **Security Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

## Building the Docker Image

### Standard Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-key \
  -t cascade-app:latest \
  .
```

### Build with Custom Tag

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-key \
  -t cascade-app:v1.0.0 \
  .
```

### Multi-platform Build (ARM64 + AMD64)

For deployment on different architectures:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-key \
  -t cascade-app:latest \
  --push \
  .
```

### Build Optimization

The Dockerfile uses multi-stage builds to minimize image size:

1. **Base Stage**: Node.js 22 Alpine
2. **Dependencies Stage**: Installs production dependencies
3. **Builder Stage**: Builds the Next.js application
4. **Runner Stage**: Minimal production runtime (~200MB)

## Running with Docker Compose

### Start Services

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f cascade-app

# Stop services
docker-compose down
```

### Development Mode with Hot Reload

For local development with hot reload:

```bash
# Use docker-compose.dev.yml (if you create one)
docker-compose -f docker-compose.dev.yml up
```

### Restart Services

```bash
# Restart a single service
docker-compose restart cascade-app

# Rebuild and restart
docker-compose up -d --build
```

## Health Checks

The application includes built-in health checks:

### Docker Health Check

The Dockerfile includes automatic health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"
```

### Manual Health Check

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' cascade-app

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' cascade-app
```

### Create Health Check Endpoint

You need to create an API route for health checks:

**File**: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker logs cascade-app

# Common causes:
# - Missing environment variables
# - Port 3000 already in use
# - Build failed
```

#### 2. Environment Variables Not Loading

```bash
# Verify environment variables are set
docker exec cascade-app printenv | grep NEXT_PUBLIC

# Rebuild with correct build args
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url ...
```

#### 3. Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Use different port
docker run -p 3001:3000 cascade-app
```

#### 4. Build Fails with "npm ERR!"

```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t cascade-app .
```

#### 5. Health Check Failing

```bash
# Verify health endpoint exists
curl http://localhost:3000/api/health

# Check health check logs
docker inspect cascade-app | grep -A 10 Health
```

### Debug Mode

Run container with debug output:

```bash
docker run -p 3000:3000 \
  -e DEBUG=* \
  -e NODE_ENV=production \
  cascade-app
```

### Access Container Shell

```bash
# Enter running container
docker exec -it cascade-app sh

# Check file structure
docker exec cascade-app ls -la /app

# Check Node.js version
docker exec cascade-app node --version
```

## Production Considerations

### Security

1. **Use HTTPS**: Always deploy behind a reverse proxy with SSL/TLS
2. **Environment Variables**: Never hardcode secrets in Dockerfile
3. **Non-Root User**: Dockerfile runs as `nextjs` user (UID 1001)
4. **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
5. **Update Dependencies**: Regularly update Node.js base image

### Performance

1. **Output Tracing**: Dockerfile uses Next.js standalone output for smaller images
2. **Production Build**: Always build with `NODE_ENV=production`
3. **Resource Limits**: Set CPU and memory limits in Coolify or docker-compose

```yaml
# docker-compose.yml resource limits
services:
  cascade-app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Monitoring

1. **Health Checks**: Monitor `/api/health` endpoint
2. **Logs**: Aggregate logs using Coolify's log viewer or external service
3. **Metrics**: Consider adding Prometheus metrics for production

### Backup and Recovery

1. **Database**: Supabase handles database backups automatically
2. **Environment Variables**: Store securely in Coolify or secrets manager
3. **Container State**: Cascade is stateless (no persistent volumes needed)

### Scaling

For horizontal scaling:

1. **Multiple Instances**: Run multiple containers behind a load balancer
2. **Session Management**: Uses cookie-based auth (works with load balancing)
3. **Database Connection Pooling**: Supabase handles this automatically

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Trigger Coolify Deployment
        run: |
          curl -X POST https://your-coolify-instance/api/deploy/webhook
```

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Coolify Documentation](https://coolify.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For issues related to:
- **Docker**: Check Docker logs and this guide
- **Coolify**: Visit Coolify documentation or Discord
- **Cascade Application**: Check application logs and CLAUDE.md

## Version History

- **v1.0.0** (2026-01-20): Initial Docker configuration
  - Multi-stage Dockerfile with Next.js 15 support
  - Docker Compose for local development
  - Coolify deployment instructions
  - Health checks and monitoring
