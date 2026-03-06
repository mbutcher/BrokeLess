# Production Deployment Guide

> **Target platform**: Unraid (Docker Compose). The same steps apply to any Linux host with Docker Engine 24+ and Docker Compose v2.

---

## 1. Prerequisites

### Host Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| Disk (app data) | 10 GB | 20 GB+ |
| OS | Unraid 6.12+ / Ubuntu 22.04 | Unraid 7.x |

### Required Software

- **Docker Engine** 24+ with Docker Compose v2 (`docker compose` command)
  - Unraid: install the **Docker** and **Community Applications** plugins
- **Git** — to clone the repository
- **A domain name** (or local LAN hostname) with SSL certificate
  - Recommended: [Let's Encrypt](https://letsencrypt.org/) via ACME + Nginx Proxy Manager, or Unraid's built-in reverse proxy

### Ports Required

| Service | Port | Note |
|---------|------|------|
| Nginx | 80, 443 | Public-facing (HTTP redirect + HTTPS) |
| Backend | 127.0.0.1:3001 | Loopback only — not exposed externally |
| MariaDB | (internal) | Private Docker network only |
| Redis | (internal) | Private Docker network only |

---

## 2. Clone the Repository

```bash
git clone <repository-url> /mnt/user/repos/BudgetApp
cd /mnt/user/repos/BudgetApp
```

On Unraid you can store the repo anywhere readable by Docker. `/mnt/user/repos/` is a common convention.

---

## 3. Generate Production Secrets

Run the key-generation script, passing `production` as the environment:

```bash
./scripts/setup/generate-keys.sh production
```

This creates files under `secrets/production/`:

| File | Description |
|------|-------------|
| `db_password.txt` | MariaDB application user password |
| `db_root_password.txt` | MariaDB root password |
| `db_encryption_key.txt` | MariaDB InnoDB file-key-management key |
| `jwt_secret.txt` | JWT signing secret (HMAC-SHA256) |
| `encryption_key.txt` | AES-256-GCM master key for field-level encryption |
| `password_pepper.txt` | Argon2id pepper for password hashing |
| `redis_password.txt` | Redis `requirepass` password |

**Never commit these files to version control.** The `secrets/` directory is git-ignored.

Store a secure backup of `secrets/production/` somewhere outside the repository (e.g., an encrypted password manager or an encrypted USB drive).

---

## 4. Configure `secrets/production/.env`

Copy the example file and fill in the required values:

```bash
cp secrets/.env.example secrets/production/.env
```

Edit `secrets/production/.env`:

```env
# ── Application ───────────────────────────────────────────────────────────────
NODE_ENV=production
APP_PORT=3001
# The public URL users access — used for WebAuthn RP origin and CORS
APP_URL=https://budget.yourdomain.com

# ── Database ──────────────────────────────────────────────────────────────────
DB_HOST=mariadb          # Docker service name — do not change
DB_PORT=3306
DB_NAME=budget_app
DB_USER=budget_user
# DB_PASSWORD is loaded from secrets/production/db_password.txt

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_HOST=redis         # Docker service name — do not change
REDIS_PORT=6379
# REDIS_PASSWORD is loaded from secrets/production/redis_password.txt

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
# JWT_SECRET is loaded from secrets/production/jwt_secret.txt

# ── Encryption ────────────────────────────────────────────────────────────────
ENCRYPTION_ALGORITHM=aes-256-gcm
# ENCRYPTION_KEY is loaded from secrets/production/encryption_key.txt
# PASSWORD_PEPPER is loaded from secrets/production/password_pepper.txt

# ── CORS ──────────────────────────────────────────────────────────────────────
# Must match APP_URL exactly (no trailing slash)
CORS_ORIGIN=https://budget.yourdomain.com

# ── WebAuthn (Passkeys) ───────────────────────────────────────────────────────
WEBAUTHN_RP_NAME=Budget App
# RP_ID must be the effective domain (no protocol, no port, no path)
WEBAUTHN_RP_ID=budget.yourdomain.com
WEBAUTHN_ORIGIN=https://budget.yourdomain.com

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL=info
LOG_DIR=/app/logs

# ── Rate Limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000

# ── SimpleFIN (optional) ─────────────────────────────────────────────────────
SIMPLEFIN_API_URL=https://bridge.simplefin.org
```

---

## 5. Prepare Data Directories

The production Compose file expects these paths to exist on the host:

```bash
mkdir -p /mnt/user/appdata/budget-app/mariadb/data
mkdir -p /mnt/user/appdata/budget-app/mariadb/backups
mkdir -p /mnt/user/appdata/budget-app/mariadb/keys
mkdir -p /mnt/user/appdata/budget-app/redis/data
mkdir -p /mnt/user/appdata/budget-app/logs/nginx
mkdir -p /mnt/user/appdata/budget-app/logs/backend
mkdir -p /mnt/user/appdata/budget-app/ssl
mkdir -p /mnt/user/appdata/budget-app/uploads
```

---

## 6. SSL Certificate

Place your SSL certificate and private key in `/mnt/user/appdata/budget-app/ssl/`:

```
/mnt/user/appdata/budget-app/ssl/
  cert.pem      ← Full chain certificate
  key.pem       ← Private key
```

### Option A — Nginx Proxy Manager (Recommended for Unraid)

1. Install **Nginx Proxy Manager** from Unraid Community Applications.
2. In NPM, create a new **Proxy Host** pointing to `budget_nginx:443` (or use NPM itself as the TLS termination point and proxy to `budget_backend:3001` and `budget_frontend:80`).
3. Use the NPM Let's Encrypt integration to auto-provision and renew certificates.

When using NPM as the outer proxy, you can remove the Nginx container from the BudgetApp Compose file and expose backend on port 3001 and frontend on port 3000 directly (still LAN-only).

### Option B — Self-Signed (LAN only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /mnt/user/appdata/budget-app/ssl/key.pem \
  -out /mnt/user/appdata/budget-app/ssl/cert.pem \
  -subj "/CN=budget.lan"
```

### Required Proxy Headers

If you are using an external reverse proxy (Nginx Proxy Manager, Traefik, etc.), ensure these headers are forwarded to the backend:

```
X-Forwarded-For: <client-ip>
X-Forwarded-Proto: https
X-Real-IP: <client-ip>
Host: budget.yourdomain.com
```

---

## 7. Start the Stack

From the repository root:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

`--build` compiles fresh images from your local source on first run. Subsequent starts do not need `--build` unless you have pulled new code.

Check that all containers are healthy:

```bash
docker compose -f docker/docker-compose.prod.yml ps
```

Expected output:

```
NAME               STATUS                 PORTS
budget_nginx       Up                     0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
budget_frontend    Up
budget_backend     Up (healthy)           127.0.0.1:3001->3001/tcp
budget_mariadb     Up (healthy)
budget_redis       Up (healthy)
```

---

## 8. First Run — Migrations

The backend container automatically runs pending database migrations at startup before accepting connections. You can confirm by checking the logs:

```bash
docker logs budget_backend | grep -i migrat
```

You should see lines like:

```
[info] Running migrations...
[info] Migrations complete
[info] Server listening on :3001
```

If a migration fails, the container will exit. Check logs for the specific error and fix before restarting.

To run migrations manually:

```bash
docker exec budget_backend npm run migrate
```

---

## 9. Verify the Deployment

1. Open `https://budget.yourdomain.com` in a browser.
2. Create your first user account on the registration page.
3. Check the backend health endpoint:

```bash
curl -sk https://budget.yourdomain.com/api/v1/health | jq .
# { "status": "ok" }
```

---

## 10. Backup & Restore

### What to Back Up

All persistent data lives under `/mnt/user/appdata/budget-app/`:

| Path | Contents |
|------|----------|
| `mariadb/data/` | All database files (InnoDB tablespaces, logs) |
| `mariadb/keys/` | InnoDB encryption keyfile |
| `redis/data/` | Redis AOF (session data) |
| `logs/` | Application and Nginx logs |
| `uploads/` | User-uploaded files |
| `secrets/production/` | All secret files (store separately, encrypted!) |

### Automated MariaDB Dump (Recommended)

A logical dump is more portable than raw InnoDB files:

```bash
# Create a dated SQL dump (run this on the host)
docker exec budget_mariadb \
  sh -c 'mysqldump -u root -p"$(cat /run/secrets/db_root_password)" \
    --single-transaction --routines --triggers budget_app' \
  > /mnt/user/appdata/budget-app/mariadb/backups/budget_$(date +%Y%m%d_%H%M%S).sql.gz
```

Or add it to Unraid's **User Scripts** plugin to run nightly.

### Restore from SQL Dump

```bash
# Stop the backend to avoid writes during restore
docker compose -f docker/docker-compose.prod.yml stop backend

# Import the dump
gunzip -c /path/to/backup.sql.gz | docker exec -i budget_mariadb \
  sh -c 'mysql -u root -p"$(cat /run/secrets/db_root_password)" budget_app'

# Restart
docker compose -f docker/docker-compose.prod.yml start backend
```

### Full Appdata Restore

If restoring to a new host:

1. Copy the backed-up `secrets/production/` to the new location.
2. Copy `/mnt/user/appdata/budget-app/` to the new host (same path).
3. Clone the repository at the same version tag.
4. Run `docker compose -f docker/docker-compose.prod.yml up -d --build`.

---

## 11. Upgrading

```bash
# 1. Pull the latest code
cd /mnt/user/repos/BudgetApp
git pull

# 2. Stop the stack (preserves volumes)
docker compose -f docker/docker-compose.prod.yml down

# 3. Rebuild and start
docker compose -f docker/docker-compose.prod.yml up -d --build
```

The backend container runs `npm run migrate` at startup — any new migrations are applied automatically before the API becomes available.

---

## 12. Troubleshooting

### View Live Logs

```bash
# All services
docker compose -f docker/docker-compose.prod.yml logs -f

# Single service
docker logs -f budget_backend
docker logs -f budget_mariadb
docker logs -f budget_nginx
```

### Backend Unhealthy / Not Starting

```bash
docker logs budget_backend | tail -50
```

Common causes:
- **Migration failure** — check for SQL errors in the log.
- **Cannot connect to MariaDB** — MariaDB may still be initializing; the backend retries automatically. If it persists, check `docker logs budget_mariadb`.
- **Missing secret file** — verify all `secrets/production/*.txt` files exist.
- **CORS / WebAuthn mismatch** — `APP_URL`, `CORS_ORIGIN`, `WEBAUTHN_ORIGIN`, and `WEBAUTHN_RP_ID` must all match the public hostname.

### Database Access

```bash
docker exec -it budget_mariadb \
  sh -c 'mysql -u budget_user -p"$(cat /run/secrets/db_password)" budget_app'
```

### Redis Access

```bash
docker exec -it budget_redis \
  sh -c 'redis-cli -a "$(cat /run/secrets/redis_password)"'
```

### SSL Issues

- Confirm `cert.pem` and `key.pem` exist in `/mnt/user/appdata/budget-app/ssl/`.
- The cert must include the full chain (server cert + intermediates).
- Reload Nginx after replacing certs:

```bash
docker exec budget_nginx nginx -s reload
```

### Reset a Stuck Migration

```bash
# Roll back the last migration
docker exec budget_backend npm run migrate:rollback

# Apply again
docker exec budget_backend npm run migrate
```

### Wipe and Redeploy (Destructive)

```bash
# Remove containers AND volumes (all data lost)
docker compose -f docker/docker-compose.prod.yml down -v
docker compose -f docker/docker-compose.prod.yml up -d --build
```
