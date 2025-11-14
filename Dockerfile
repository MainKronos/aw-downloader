# # ============================================
# # Stage 1: Build Frontend (Next.js)
# # ============================================
# FROM node:20-alpine AS frontend-builder

# WORKDIR /app/frontend

# # Copy frontend package files
# COPY frontend/package*.json ./

# # Install dependencies
# RUN npm ci --only=production && \
#     npm cache clean --force

# # Copy frontend source
# COPY frontend/ ./

# # Build Next.js app (static export)
# RUN npm run build

# # ============================================
# # Stage 2: Build Backend (AdonisJS)
# # ============================================
# FROM node:20-alpine AS backend-builder

# WORKDIR /app/backend

# # Copy backend package files
# COPY backend/package*.json ./

# # Install all dependencies (including dev dependencies for build)
# RUN npm ci && \
#     npm cache clean --force

# # Copy backend source
# COPY backend/ ./

# # Build AdonisJS app
# RUN npm run build

# # ============================================
# # Stage 3: Production Runtime
# # ============================================
# FROM node:20-alpine AS production

# # Install dumb-init and wget for proper signal handling and health checks
# RUN apk add --no-cache dumb-init wget

# WORKDIR /app

# # Create non-root user
# RUN addgroup -g 1001 -S nodejs && \
#     adduser -S nodejs -u 1001

# # Copy built backend from builder
# COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/build /app

# # Install only production dependencies in the built app
# WORKDIR /app
# RUN npm ci --only=production && \
#     npm cache clean --force

# # Copy frontend build to backend's public directory
# COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/out /app/public

# # Copy healthcheck script
# COPY --chown=nodejs:nodejs healthcheck.sh /app/healthcheck.sh
# RUN chmod +x /app/healthcheck.sh

# # Create necessary directories with correct permissions
# RUN mkdir -p /app/storage/downloads \
#     /app/storage/posters \
#     /app/tmp/downloads \
#     /app/database && \
#     chown -R nodejs:nodejs /app/storage \
#     /app/tmp \
#     /app/database

# # Switch to non-root user
# USER nodejs

# # Expose port
# EXPOSE 3333

# # Health check using the script
# HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
#     CMD ["/app/healthcheck.sh"]

# # Use dumb-init to handle signals properly
# ENTRYPOINT ["dumb-init", "--"]

# # Start the application
# CMD ["node", "bin/server.js"]



ARG NODE_IMAGE=node:20-alpine

FROM $NODE_IMAGE AS base
RUN apk --no-cache add dumb-init
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node
RUN mkdir tmp storage

# ============================================
# Backend Stage
FROM base AS dependencies
COPY --chown=node:node ./backend/package*.json ./
RUN npm ci
COPY --chown=node:node ./backend/ ./

FROM dependencies AS build
RUN node ace build

# ============================================
# Frontend Stage
FROM $NODE_IMAGE AS dependencies_frontend
RUN mkdir -p /app && chown node:node /app
WORKDIR /app
USER node
COPY --chown=node:node ./frontend/package*.json ./
RUN npm ci
COPY --chown=node:node ./frontend/ ./

FROM dependencies_frontend AS build_frontend
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
ENV PORT=6547
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info
ENV APP_KEY=X84YyWpm45JJgmvYsv2szdbDsBl45SSn
COPY --chown=node:node ./backend/package*.json ./
RUN npm ci --production
COPY --chown=node:node --from=build /app/build .
COPY --chown=node:node --from=build_frontend /app/build/ ./public/
COPY --chown=node:node entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 6547
CMD [ "sh", "entrypoint.sh" ]
