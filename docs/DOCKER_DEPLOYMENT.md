# Docker Deployment Guide for Cascade

This guide covers deploying the Cascade application using Docker and Docker Compose, with specific instructions for Coolify deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Coolify Deployment](#coolify-deployment)
- [Environment Variables](#environment-variables)
- [Building the Docker Image](#building-the-docker-image)
- [Running with Docker Compose](#running-with-docker-compose)
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

# Copy environment template (use .env for Docker, .env.local for local dev)
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 3. Access the Application

Open your browser to `http://localhost:3000`

## Coolify Deployment

Coolify is a self-hosted Heroku/Vercel/Netlify alternative. Here's how to deploy Cascade on Coolify:

### Step 1: Create New Resource

1. Log into your Coolify instance
2. Navigate to your server/project
3. Click "Add New Resource" → "Application"
4. Select "Dockerfile"

### Step 2: Configure Git Repository

1. **Repository URL**: `https://github.com/your-org/Cascade`
2. **Branch**: `main` (or your production branch)
3. **Build Pack**: Select "Dockerfile"

### Step 3: Set Environment Variables

In Coolify's environment variables section, add:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key-here

# Node Environment
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

### Step 4: Configure Ports

- **Internal Port**: `3000`
- **Public Port**: Your choice (Coolify will handle this)
- **Protocol**: HTTP

### Step 5: Deploy

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

| Variable                                       | Description                 | Example                                   |
| ---------------------------------------------- | --------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Your Supabase project URL   | `https://xxx.supabase.co`                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Environment Variables

| Variable                  | Description               | Default      |
| ------------------------- | ------------------------- | ------------ |
| `NODE_ENV`                | Node environment          | `production` |
| `PORT`                    | Application port          | `3000`       |
| `HOSTNAME`                | Bind hostname             | `0.0.0.0`    |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1`          |

### Environment File Structure

For Docker deployment, create a `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Override defaults
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

⚠️ **Security Note**: Never commit `.env` or `.env.local` to version control. Both are already in `.gitignore`.

## Building the Docker Image

### Standard Build

```bash
docker build -t cascade-app:latest .
```

### Build with Custom Tag

```bash
docker build -t cascade-app:v1.0.0 .
```

### Multi-platform Build (ARM64 + AMD64)

For deployment on different architectures:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t cascade-app:latest \
  --push \
  .
```

### Build Optimization

The Dockerfile uses multi-stage builds to minimize image size:

1. **Base Stage**: Node.js 24 Alpine
2. **Dependencies Stage**: Installs all dependencies + Alpine-compatible SWC binary
3. **Builder Stage**: Builds the Next.js application with optimized memory settings
4. **Runner Stage**: Minimal production runtime with standalone output

## Running with Docker Compose

### Start Services

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Rebuild and Restart

```bash
# Rebuild and restart
docker-compose up -d --build
```

### Docker Compose Features

The included `docker-compose.yml` provides:

- **Resource Reservations**: Minimum 512MB memory, 0.25 CPU
- **Security**: `no-new-privileges` security option
- **Logging**: JSON file driver with rotation (10MB max, 3 files)
- **Automatic Restart**: `unless-stopped` restart policy
- **Flexible Port**: Uses `PORT` env var with default of 3000

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

# Make sure .env file exists and has correct values
cat .env
```

#### 3. Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Use different port in .env
PORT=3001
```

#### 4. Build Fails with "npm ERR!"

```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t cascade-app .
```

#### 5. SWC Binary Issues

The Dockerfile includes `@next/swc-linux-x64-musl` for Alpine compatibility. If you still see SWC errors:

```bash
# Rebuild with no cache
docker build --no-cache -t cascade-app .
```

### Debug Mode

Run container with debug output:

```bash
docker run -p 3000:3000 \
  --env-file .env \
  -e DEBUG=* \
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
5. **No New Privileges**: docker-compose uses `no-new-privileges` security option
6. **Update Dependencies**: Regularly update Node.js base image

### Performance

1. **Standalone Output**: Dockerfile uses Next.js standalone output for smaller images
2. **Memory Optimization**: Build uses `NODE_OPTIONS="--max-old-space-size=4096"`
3. **Resource Reservations**: Minimum resources ensure stable operation

### Monitoring

1. **Health Checks**: Use `/api/health` endpoint for monitoring
2. **Logs**: Configured with JSON driver and rotation to prevent disk issues
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

- **v1.1.0** (2026-02-01): Updated Docker configuration
  - Node.js 24 Alpine base image
  - Alpine-compatible SWC binary
  - Simplified docker-compose with resource reservations
  - Security options and logging configuration
- **v1.0.0** (2026-01-20): Initial Docker configuration
