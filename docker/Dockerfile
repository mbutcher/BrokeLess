# Combined production image: React frontend (nginx) + Node.js backend (Express)
# managed by supervisord within a single container.
#
# Build context: project root
# Usage: docker compose -f docker/docker-compose.prod.yml build

# ─── Stage 1: Frontend build ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force

COPY frontend/ ./

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Stage 2: Backend build ──────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci && npm cache clean --force

COPY backend/ ./

RUN npm run build

# ─── Stage 3: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine

# Install nginx and supervisord
RUN apk add --no-cache nginx supervisor

# ── nginx ──
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /run/nginx \
    && chown -R nginx:nginx /var/lib/nginx /var/log/nginx /run/nginx \
    && chmod 755 /usr/share/nginx/html

# ── backend ──
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend-builder /app/dist ./dist

RUN mkdir -p /app/logs /app/uploads

# ── supervisord ──
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
