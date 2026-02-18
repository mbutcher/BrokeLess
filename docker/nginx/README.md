# Nginx Reverse Proxy Configuration

This directory contains the Nginx reverse proxy configuration used as the main entry point for the Budget App in production deployments.

## Architecture Overview

The Budget App uses a **two-tier Nginx architecture**:

1. **Reverse Proxy** (this directory): SSL termination, routing, security headers
2. **Frontend Server** (`frontend/nginx.conf`): Serves static React files

```
Internet
    ↓
[Nginx Reverse Proxy] (443/80)
    ├─> [Frontend Container] (nginx serving static files)
    └─> [Backend Container] (Express API on :3001)
```

## Configuration Files

### 1. `nginx.conf`
**Purpose**: Main Nginx reverse proxy configuration

**Used by**: `budget_nginx` container in production (`docker-compose.prod.yml`)

**Responsibilities**:
- SSL/TLS termination with certificate from `/etc/nginx/ssl/`
- HTTP to HTTPS redirect
- Proxy requests to backend (`/api/v1/*` → `http://backend:3001`)
- Proxy requests to frontend (`/*` → `http://frontend:80`)
- Rate limiting (10 req/s general, 5 req/min for auth endpoints)
- WebSocket support for real-time features
- Security headers (HSTS, CSP, X-Frame-Options, etc.)

**Mounted volumes**:
- SSL certificates: `/mnt/user/appdata/budget-app/ssl` → `/etc/nginx/ssl`
- Logs: `/mnt/user/appdata/budget-app/logs/nginx` → `/var/log/nginx`

**Key settings**:
```nginx
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers on;
client_max_body_size 10M;
```

### 2. `conf.d/security-headers.conf`
**Purpose**: Security-related HTTP headers

**Included by**: `nginx.conf`

**Headers configured**:
- `Strict-Transport-Security` (HSTS) - 1 year
- `X-Frame-Options` - Prevent clickjacking
- `X-Content-Type-Options` - Prevent MIME sniffing
- `Content-Security-Policy` - XSS protection
- `Referrer-Policy` - Privacy protection
- `Permissions-Policy` - Feature restrictions

**When to modify**: When adding new integrations or changing security requirements

### 3. `conf.d/ssl.conf`
**Purpose**: SSL/TLS protocol configuration

**Settings**:
- TLS 1.3 only for maximum security
- Strong cipher suites
- DH parameters for forward secrecy
- OCSP stapling
- SSL session caching

**When to modify**: When security best practices change or compatibility issues arise

### 4. `Dockerfile`
**Purpose**: Build the Nginx reverse proxy container

**Base image**: `nginx:alpine` (lightweight, secure)

**Build process**:
1. Copy configuration files to `/etc/nginx/`
2. Create necessary directories
3. Set proper permissions
4. Health check: `curl -f http://localhost/health || exit 1`

**Build command** (from docker directory):
```bash
docker build -t budget-nginx -f nginx/Dockerfile ./nginx
```

## Frontend Nginx Configuration

**Location**: `frontend/nginx.conf`

**Used by**: `budget_frontend` container

**Purpose**: Serve pre-built React static files from the frontend container

**Responsibilities**:
- Serve static files from `/usr/share/nginx/html/`
- SPA routing (all routes → `index.html`)
- Gzip compression
- Cache control headers
- Basic security headers

**Key difference**: This is NOT the main entry point. The reverse proxy (`docker/nginx/nginx.conf`) forwards requests to this server.

## When to Use Which Configuration

| Task | File to Edit |
|------|-------------|
| Add/modify API routes | `docker/nginx/nginx.conf` (reverse proxy) |
| Change SSL settings | `docker/nginx/conf.d/ssl.conf` |
| Update security headers | `docker/nginx/conf.d/security-headers.conf` |
| Adjust rate limiting | `docker/nginx/nginx.conf` |
| Change frontend serving | `frontend/nginx.conf` |
| Add new upstream service | `docker/nginx/nginx.conf` |

## Development vs Production

### Development (`docker-compose.dev.yml`)
- **Nginx reverse proxy**: NOT used
- **Frontend**: Vite dev server on `:3000` (hot reload)
- **Backend**: Direct access on `:3001`
- **SSL**: Not enabled

### Production (`docker-compose.prod.yml`)
- **Nginx reverse proxy**: Main entry point on `:443` (HTTPS) and `:80` (redirects to HTTPS)
- **Frontend**: Nginx serving built static files (internal only)
- **Backend**: Internal only, accessed via reverse proxy
- **SSL**: Required, certificates mounted from host

## Common Tasks

### Adding a New API Endpoint Route
Edit `docker/nginx/nginx.conf`:

```nginx
location /api/v1/new-feature {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
    # ... other proxy settings
}
```

### Updating SSL Certificate
1. Generate new certificate: `./scripts/setup/generate-ssl-cert.sh`
2. Copy to production location: `/mnt/user/appdata/budget-app/ssl/`
3. Reload nginx: `docker exec budget_nginx nginx -s reload`

### Adjusting Rate Limits
Edit `docker/nginx/nginx.conf`:

```nginx
# General API rate limit (adjust the rate)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Auth endpoints rate limit
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
```

### Adding Security Headers
Edit `docker/nginx/conf.d/security-headers.conf`:

```nginx
add_header New-Security-Header "value" always;
```

### Enabling WebSocket for New Endpoints
Edit `docker/nginx/nginx.conf` in the appropriate location block:

```nginx
location /api/v1/websocket {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://backend;
}
```

## Troubleshooting

### Check Configuration Syntax
```bash
docker exec budget_nginx nginx -t
```

### Reload Without Downtime
```bash
docker exec budget_nginx nginx -s reload
```

### View Error Logs
```bash
docker logs budget_nginx
# OR
tail -f /mnt/user/appdata/budget-app/logs/nginx/error.log
```

### View Access Logs
```bash
tail -f /mnt/user/appdata/budget-app/logs/nginx/access.log
```

### Test SSL Configuration
```bash
openssl s_client -connect localhost:443 -servername budget.local
```

### Test Rate Limiting
```bash
# Send multiple rapid requests
for i in {1..20}; do
  curl -k https://localhost/api/v1/health
done
```

## Security Considerations

1. **SSL Certificates**: Use proper certificates from Let's Encrypt in production, not self-signed
2. **Rate Limiting**: Adjust based on expected traffic and abuse patterns
3. **Security Headers**: Keep CSP strict but functional for the application
4. **Logs**: Rotate logs regularly to prevent disk space issues
5. **Updates**: Keep Nginx updated by rebuilding containers with latest alpine image

## References

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
