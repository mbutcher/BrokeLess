#!/bin/bash
# BudgetApp — Production Setup Script
# Run this once on your host to prepare everything before the first launch.
#
# Usage:
#   ./scripts/setup/setup-prod.sh
#   ./scripts/setup/setup-prod.sh --domain budget.yourdomain.com
#   ./scripts/setup/setup-prod.sh --domain budget.yourdomain.com --port 8080
#
# The script will:
#   1. Validate prerequisites (Docker, Docker Compose, openssl)
#   2. Prompt for your domain / LAN hostname
#   3. Ask whether you are using Nginx Proxy Manager and what host port to use
#   4. Prompt for your database choice (SQLite default, MariaDB, or PostgreSQL)
#   5. Generate the master secret and derive all cryptographic sub-keys
#   6. Write the production .env and docker port configuration
#   7. Create required host directories and start the Docker stack
#
# SSL is handled by Nginx Proxy Manager (or any external reverse proxy).
# See docs/deployment/deployment.md for full setup instructions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Defaults ────────────────────────────────────────────────────────────────────
DOMAIN=""
HOST_PORT=""
DATA_DIR="/mnt/user/appdata/budget-app"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.prod.yml"
COMPOSE_ENV_FILE="$PROJECT_ROOT/docker/.env"
SECRET_DIR="$PROJECT_ROOT/secrets/production"

# ── Argument parsing ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --port)   HOST_PORT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colour helpers ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}i${RESET}  $*"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}!${RESET}  $*"; }
error()   { echo -e "${RED}✖${RESET}  $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}$*${RESET}"; }
ask_default() {
  # ask_default "Prompt" VAR_NAME "default_value"
  local prompt="$1" varname="$2" default="$3" val=""
  read -rp "  $prompt [$default]: " val || true
  printf -v "$varname" '%s' "${val:-$default}"
}

# ── Banner ────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      BudgetApp — Production Setup        ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── 1/7  Prerequisites ────────────────────────────────────────────────────────────
header "1/7  Checking prerequisites"

command -v docker  &>/dev/null || error "Docker is not installed. Install Docker Engine 24+."
docker compose version &>/dev/null || error "Docker Compose v2 is not available. Update Docker."
command -v openssl &>/dev/null || error "openssl is not installed."

success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' || docker --version)"
success "Docker Compose $(docker compose version --short 2>/dev/null || docker compose version)"
success "openssl $(openssl version | awk '{print $2}')"

# ── 2/7  Domain / hostname ────────────────────────────────────────────────────────
header "2/7  Domain / hostname"

if [[ -z "$DOMAIN" ]]; then
  echo ""
  echo "  Enter the hostname or IP address users will reach BudgetApp at."
  echo "  Examples:  budget.yourdomain.com   |   budget.lan   |   192.168.1.100"
  echo ""
  read -rp "  Domain / hostname: " DOMAIN || true
fi

[[ -z "$DOMAIN" ]] && error "Domain cannot be empty."

# Strip protocol prefix if user pasted a full URL
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

# Strip port for the WebAuthn RP ID (must be bare hostname, no port)
WEBAUTHN_RP_ID="${DOMAIN%%:*}"

success "Domain set to: $DOMAIN"

# ── 3/7  Proxy / port ─────────────────────────────────────────────────────────────
header "3/7  Proxy and port"

echo ""
echo "  Nginx Proxy Manager (NPM) adds HTTPS and routes traffic to BudgetApp."
echo "  If you are on Unraid with NPM installed, answer yes."
echo "  If you are accessing the app directly without a reverse proxy, answer no."
echo "  Note: passkeys and push notifications require HTTPS."
echo ""

USE_NPM_INPUT=""
read -rp "  Are you using Nginx Proxy Manager? [Y/n]: " USE_NPM_INPUT || true
USE_NPM_INPUT="${USE_NPM_INPUT:-y}"

if [[ "${USE_NPM_INPUT,,}" =~ ^y ]]; then
  PROTOCOL="https"
  success "HTTPS selected — NPM will handle your SSL certificate."
else
  PROTOCOL="http"
  warn "HTTP selected. Some features require HTTPS and will be unavailable."
fi

APP_URL="${PROTOCOL}://${DOMAIN}"

echo ""
echo "  BudgetApp listens on a host port that NPM (or your browser) connects to."
echo "  Choose a port that is not already in use on this server."
echo "  The default (13911) is unlikely to conflict with other Unraid containers."
echo ""

if [[ -z "$HOST_PORT" ]]; then
  ask_default "Host port" HOST_PORT "13911"
fi

# Validate port is numeric and in valid range
if ! [[ "$HOST_PORT" =~ ^[0-9]+$ ]] || [[ "$HOST_PORT" -lt 1 || "$HOST_PORT" -gt 65535 ]]; then
  error "Invalid port: '$HOST_PORT'. Must be a number between 1 and 65535."
fi

success "Host port: ${HOST_PORT}"

# ── 4/7  Database selection ───────────────────────────────────────────────────────
header "4/7  Database"

echo ""
echo "  BudgetApp uses SQLite by default — a single file on your server, no extra"
echo "  setup required. Most households will never need anything else."
echo ""

DB_TYPE="sqlite"
USE_EXTERNAL_DB=""
read -rp "  Use an external database instead (MariaDB or PostgreSQL)? [y/N]: " USE_EXTERNAL_DB || true

if [[ "${USE_EXTERNAL_DB,,}" =~ ^y ]]; then
  echo ""
  echo "  Choose your database:"
  echo "    1) MariaDB    — use an existing MariaDB server"
  echo "    2) PostgreSQL — use an existing PostgreSQL server"
  echo ""
  DB_CHOICE=""
  while true; do
    read -rp "  Choice [1]: " DB_CHOICE || true
    DB_CHOICE="${DB_CHOICE:-1}"
    case "$DB_CHOICE" in
      1) DB_TYPE="mariadb";  break ;;
      2) DB_TYPE="postgres"; break ;;
      *) echo "  Please enter 1 or 2." ;;
    esac
  done
fi

DB_CLIENT=""
DB_PATH=""
DB_HOST=""; DB_PORT=""; DB_NAME=""; DB_USER=""; DB_PASSWORD=""

case "$DB_TYPE" in
  sqlite)
    DB_CLIENT="sqlite3"
    DB_PATH="/app/data/budget.db"
    success "SQLite selected — database file: ${DATA_DIR}/data/budget.db"
    ;;

  mariadb)
    DB_CLIENT="mysql2"
    echo ""
    echo "  If you haven't created the database yet, run these SQL commands first:"
    echo ""
    echo -e "  ${BOLD}  CREATE DATABASE IF NOT EXISTS budget_app"
    echo "    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo "  CREATE USER 'budget_user'@'%' IDENTIFIED BY 'your_password';"
    echo "  GRANT ALL PRIVILEGES ON budget_app.* TO 'budget_user'@'%';"
    echo -e "  FLUSH PRIVILEGES;${RESET}"
    echo ""
    read -rp "  MariaDB host or IP: " DB_HOST || true
    [[ -z "$DB_HOST" ]] && error "Database host cannot be empty."
    ask_default "MariaDB port"  DB_PORT "3306"
    ask_default "Database name" DB_NAME "budget_app"
    ask_default "Database user" DB_USER "budget_user"
    read -rsp "  Database password: " DB_PASSWORD; echo ""
    [[ -z "$DB_PASSWORD" ]] && error "Database password cannot be empty."
    success "MariaDB connection: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    ;;

  postgres)
    DB_CLIENT="pg"
    echo ""
    echo "  If you haven't created the database yet, run these SQL commands first:"
    echo ""
    echo -e "  ${BOLD}  CREATE DATABASE budget_app;"
    echo "  CREATE USER budget_user WITH PASSWORD 'your_password';"
    echo -e "  GRANT ALL PRIVILEGES ON DATABASE budget_app TO budget_user;${RESET}"
    echo ""
    read -rp "  PostgreSQL host or IP: " DB_HOST || true
    [[ -z "$DB_HOST" ]] && error "Database host cannot be empty."
    ask_default "PostgreSQL port" DB_PORT "5432"
    ask_default "Database name"   DB_NAME "budget_app"
    ask_default "Database user"   DB_USER "budget_user"
    read -rsp "  Database password: " DB_PASSWORD; echo ""
    [[ -z "$DB_PASSWORD" ]] && error "Database password cannot be empty."
    success "PostgreSQL connection: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    ;;
esac

# ── 5/7  Generate secrets ─────────────────────────────────────────────────────────
header "5/7  Generating cryptographic secrets"

bash "$SCRIPT_DIR/generate-keys.sh" production

# Write db_password.txt.
# docker-compose always mounts this file even for SQLite; a placeholder satisfies the mount.
# env.ts reads this file in production and checks it's non-empty — placeholder is truthy.
if [[ "$DB_TYPE" == "sqlite" ]]; then
  if [[ ! -f "$SECRET_DIR/db_password.txt" ]]; then
    printf '%s' "sqlite-not-used" > "$SECRET_DIR/db_password.txt"
    chmod 600 "$SECRET_DIR/db_password.txt"
    success "db_password.txt written (placeholder — not used by SQLite)"
  else
    success "db_password.txt already exists (placeholder)"
  fi
else
  printf '%s' "$DB_PASSWORD" > "$SECRET_DIR/db_password.txt"
  chmod 600 "$SECRET_DIR/db_password.txt"
  success "Database password saved to secrets/production/db_password.txt"
fi

MASTER_HEX=$(cat "$SECRET_DIR/master_secret.txt")
echo ""
echo -e "  ${BOLD}Your master secret (save this now — it will not be shown again):${RESET}"
echo -e "  ${YELLOW}${MASTER_HEX}${RESET}"
echo ""
warn "Copy this to your password manager before continuing."

# ── 6/7  Write production .env ────────────────────────────────────────────────────
header "6/7  Writing configuration files"

# ── docker/.env — controls Docker Compose YAML variable substitution ──
# This is read by Docker Compose for port mapping: "${APP_PORT:-13911}:80"
# It is NOT the same as secrets/production/.env (which is injected into the container).
COMPOSE_ENV_CONTENT="# Docker Compose host-port configuration
# Generated by setup-prod.sh on $(date)
# This sets the host-side port in docker-compose.prod.yml: \"\${APP_PORT:-13911}:80\"
APP_PORT=${HOST_PORT}
"
if [[ -f "$COMPOSE_ENV_FILE" ]]; then
  warn "docker/.env already exists — overwriting."
fi
printf '%s' "$COMPOSE_ENV_CONTENT" > "$COMPOSE_ENV_FILE"
success "Written: docker/.env  (host port → ${HOST_PORT})"

# ── secrets/production/.env — injected into the container at runtime ──
ENV_FILE="$SECRET_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  warn "secrets/production/.env already exists — overwriting with new configuration."
fi

# Write a clean .env from scratch.
# NOTE: APP_PORT here is the port the Express server listens on INSIDE the container.
# nginx (also in the container) proxies /api and /health to 127.0.0.1:3001.
# The host-side port is in docker/.env above — it is NOT set here.
cat > "$ENV_FILE" << ENVEOF
# BudgetApp Production Configuration
# Generated by setup-prod.sh on $(date)
# Do not commit this file to version control.

NODE_ENV=production
APP_PORT=3001
APP_URL=${APP_URL}

# Database
DB_CLIENT=${DB_CLIENT}
ENVEOF

if [[ "$DB_TYPE" == "sqlite" ]]; then
  cat >> "$ENV_FILE" << ENVEOF
DB_PATH=${DB_PATH}
ENVEOF
else
  cat >> "$ENV_FILE" << ENVEOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
# DB_PASSWORD is loaded from secrets/production/db_password.txt
ENVEOF
fi

cat >> "$ENV_FILE" << ENVEOF

# JWT — secret loaded from secrets/production/jwt_secret.txt
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Encryption — keys loaded from secrets/production/encryption_key.txt + password_pepper.txt
ENCRYPTION_ALGORITHM=aes-256-gcm

# SimpleFIN (optional — add token after setup via the Integrations settings page)
SIMPLEFIN_API_URL=https://bridge.simplefin.org

# Security
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=${APP_URL}

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000

# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# WebAuthn / Passkeys
WEBAUTHN_RP_NAME=Budget App
WEBAUTHN_RP_ID=${WEBAUTHN_RP_ID}
WEBAUTHN_ORIGIN=${APP_URL}

# Push notifications (optional — generate VAPID keys with: npx web-push generate-vapid-keys)
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
# VAPID_EMAIL=
ENVEOF

chmod 600 "$ENV_FILE"
success "Written: secrets/production/.env"

# ── 7/7  Create directories and start the stack ───────────────────────────────────
header "7/7  Creating data directories and starting stack"

# These paths match the hardcoded volume mounts in docker/docker-compose.prod.yml
mkdir -p "${DATA_DIR}/data"
mkdir -p "${DATA_DIR}/logs"
mkdir -p "${DATA_DIR}/uploads"
success "Directories created under ${DATA_DIR}"

echo ""
info "Building image and starting container (first run may take a few minutes)..."
echo ""

cd "$PROJECT_ROOT"
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo ""

# Health check — uses the chosen host port → container nginx → Express /health
info "Waiting for BudgetApp to become healthy (port ${HOST_PORT})..."
max_attempts=30
attempt=0
until docker inspect budget_app --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  attempt=$((attempt + 1))
  if [[ $attempt -ge $max_attempts ]]; then
    warn "Health check timed out. The app may still be starting."
    warn "Check logs with: docker logs budget_app"
    break
  fi
  printf "  Attempt %d/%d...\r" "$attempt" "$max_attempts"
  sleep 5
done

# ── Summary ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  Setup complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  BudgetApp is running on port ${BOLD}${HOST_PORT}${RESET}."
echo ""

if [[ "${USE_NPM_INPUT,,}" =~ ^y ]]; then
  echo -e "  ${BOLD}Configure Nginx Proxy Manager:${RESET}"
  echo -e "    1. Open NPM → Proxy Hosts → Add Proxy Host"
  echo -e "    2. Domain Names:       ${BOLD}${DOMAIN}${RESET}"
  echo -e "    3. Forward Host / IP:  ${BOLD}<your Unraid server IP>${RESET}"
  echo -e "    4. Forward Port:       ${BOLD}${HOST_PORT}${RESET}"
  echo -e "    5. Enable:             ${BOLD}Websockets Support${RESET}"
  echo -e "    6. SSL tab → Request a new SSL certificate → Force SSL"
  echo -e "    7. Advanced tab → paste:"
  echo ""
  echo "       proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
  echo "       proxy_set_header X-Forwarded-Proto \$scheme;"
  echo "       proxy_set_header X-Real-IP \$remote_addr;"
  echo ""
  echo -e "  Once NPM is configured, open: ${BOLD}${APP_URL}${RESET}"
else
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "your-server-ip")
  echo -e "  Open BudgetApp at: ${BOLD}http://${LAN_IP}:${HOST_PORT}${RESET}"
fi

echo ""
echo -e "  On first visit you will be shown your ${BOLD}Master Secret${RESET}."
echo -e "  Save it before creating your account — it will not appear again."
echo ""
echo -e "  Master secret file: ${SECRET_DIR}/master_secret.txt"
echo -e "  Data directory:     ${DATA_DIR}"
echo ""
echo "  Useful commands:"
echo "    Logs:    docker compose -f docker/docker-compose.prod.yml logs -f"
echo "    Stop:    docker compose -f docker/docker-compose.prod.yml down"
echo "    Upgrade: git pull && docker compose -f docker/docker-compose.prod.yml up -d --build"
echo "    Recover: ./scripts/setup/derive-secrets.sh <master-hex>"
echo ""
