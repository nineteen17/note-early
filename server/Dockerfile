# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (this compiles TypeScript to JavaScript)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy migration files and source code for migrations
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.js ./drizzle.config.js
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts

# Create entrypoint script
COPY --chown=nodejs:nodejs <<EOF /app/entrypoint.sh
#!/bin/sh
set -e

echo "🚀 Starting NoteEarly backend..."

# Run migrations
echo "🗃️ Running database migrations..."
node dist/db/migrate.js || echo "⚠️ Migration failed or no migrations to run"

# Sync Stripe plans
echo "💳 Syncing Stripe plans..."
npm run sync:stripe || echo "⚠️ Stripe sync failed"

# Start the application
echo "🎯 Starting server..."
exec "\$@"
EOF

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER nodejs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--", "/app/entrypoint.sh"]
CMD ["node", "dist/server.js"]