FROM node:24-alpine AS base
WORKDIR /app

# ---- Dependencies ----
# Install dependencies in a separate layer to leverage Docker's caching.
# This layer is only rebuilt when package.json or package-lock.json changes.
FROM base AS deps
# Install libc6-compat for compatibility with native modules
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDependencies) needed for build
RUN npm ci && \
    npm cache clean --force

# Install the Alpine-compatible SWC binary
RUN npm install --no-save @next/swc-linux-x64-musl


# ---- Builder ----
# Rebuild the source code only when needed
FROM base AS builder
# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Don't set NODE_ENV=production here because we need devDependencies for the build
# Next.js will use production mode automatically during build
ENV NEXT_TELEMETRY_DISABLED=1

# Optimize Node.js memory and build performance
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build Next.js
RUN npm run build


# ---- Runner ----
# Production image, copy all the files and run next
FROM node:24-alpine AS runner
WORKDIR /app

# Install CA certificates for SSL/TLS support
RUN apk add --no-cache ca-certificates

# Set the environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security best practices (combine RUN commands to reduce layers)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage.
# Note: Next.js standalone mode includes necessary node_modules in the output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The command to start the production server
CMD ["node", "server.js"]
