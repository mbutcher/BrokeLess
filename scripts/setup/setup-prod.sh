#!/bin/bash
# BudgetApp — Production Setup Script
# Run this once on your host to prepare everything before the first launch.
# Usage: ./scripts/setup/setup-prod.sh [--domain budget.yourdomain.com] [--data-dir /mnt/user/appdata/budget-app]
#
# The script will:
#   1. Validate prerequisites (Docker, Docker Compose, openssl)
#   2. Prompt for your domain / LAN hostname (or accept --domain flag)
#   3. Generate the master secret and derive all cryptographic sub-keys
#   4. Create every required host directory
#   5. Write the production .env from the built-in template
#   6. Start the Docker stack
#
# SSL is handled by Nginx Proxy Manager (or any external reverse proxy).
# See docs/deployment/deployment.md for NPM setup instructions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Defaults ───────────────────────────────────────────────────────────────────
DOMAIN=""
DATA_DIR="/mnt/user/appdata/budget-app"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.prod.yml"
SECRET_DIR="$PROJECT_ROOT/secrets/production"
TZ="America/New_York"

# ── Argument parsing ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)   DOMAIN="$2";   shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --tz)       TZ="$2";       shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colour helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}i${RESET}  $*"; }
success() { echo -e "${GREEN}+${RESET}  $*"; }
warn()    { echo -e "${YELLOW}!${RESET}  $*"; }
error()   { echo -e "${RED}x${RESET}  $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}$*${RESET}"; }

# ── Banner ──────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      BudgetApp — Production Setup        ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Prerequisites ───────────────────────────────────────────────────────────────
header "1/5  Checking prerequisites"

command -v docker &>/dev/null        || error "Docker is not installed. Install Docker Engine 24+."
docker compose version &>/dev/null   || error "Docker Compose v2 is not available. Update Docker."
command -v openssl &>/dev/null       || error "openssl is not installed."

success "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"
success "Docker Compose $(docker compose version --short)"
success "openssl $(openssl version | awk '{print $2}')"

# ── Domain prompt ───────────────────────────────────────────────────────────────
header "2/5  Domain / hostname"

if [[ -z "$DOMAIN" ]]; then
  echo ""
  echo "  Enter the hostname or IP address users will reach BudgetApp at."
  echo "  Examples:  budget.yourdomain.com   |   budget.lan   |   192.168.1.100"
  echo ""
  read -rp "  Domain / hostname: " DOMAIN
fi

[[ -z "$DOMAIN" ]] && error "Domain cannot be empty."

# Strip protocol if user pasted a URL
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

# Determine protocol (raw IPs default to http; hostnames default to https via NPM)
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  PROTOCOL="http"
else
  PROTOCOL="https"
fi

APP_URL="${PROTOCOL}://${DOMAIN}"
success "Domain: $DOMAIN  ->  $APP_URL"

# ── Generate secrets ────────────────────────────────────────────────────────────
header "3/5  Generating cryptographic secrets"

bash "$SCRIPT_DIR/generate-keys.sh" production

MASTER_HEX=$(cat "$SECRET_DIR/master_secret.txt")
echo ""
echo -e "  ${BOLD}Your master secret (the only value you need to save):${RESET}"
echo -e "  ${YELLOW}${MASTER_HEX}${RESET}"
echo ""
warn "Copy this to your password manager before continuing."
success "All sub-keys derived and written to: $SECRET_DIR"

# ── Write production .env ───────────────────────────────────────────────────────
header "4/5  Writing production .env"

ENV_FILE="$SECRET_DIR/.env"

patch_env() {
  local key="$1" value="$2"
  local escaped_value
  escaped_value=$(printf '%s' "$value" | sed 's|[&/\\]|\\&|g')
  sed -i.bak "s|^${key}=.*|${key}=${escaped_value}|" "$ENV_FILE"
}

patch_env "NODE_ENV"          "production"
patch_env "APP_URL"           "$APP_URL"
patch_env "CORS_ORIGIN"       "$APP_URL"
patch_env "WEBAUTHN_RP_ID"    "$DOMAIN"
patch_env "WEBAUTHN_ORIGIN"   "$APP_URL"
patch_env "LOG_LEVEL"         "info"
patch_env "LOG_DIR"           "/app/logs"
patch_env "TZ"                "$TZ"

rm -f "$ENV_FILE.bak"
success "Written: $ENV_FILE"

ENV_DB_FILE="$SECRET_DIR/.env.db"
if [[ -f "$ENV_DB_FILE" ]]; then
  sed -i.bak "s|^TZ=.*|TZ=${TZ}|" "$ENV_DB_FILE"
  rm -f "$ENV_DB_FILE.bak"
fi

# ── Create data directories and start the stack ─────────────────────────────────
header "5/5  Creating data directories and starting stack"

dirs=(
  "mariadb/data"
  "mariadb/backups"
  "mariadb/keys"
  "redis/data"
  "logs/backend"
  "uploads"
)

for d in "${dirs[@]}"; do
  mkdir -p "${DATA_DIR}/${d}"
done
success "Directories created under ${DATA_DIR}"

# Create the MariaDB InnoDB encryption keyfile (required before first start)
KEY_FILE="${DATA_DIR}/mariadb/keys/keyfile.enc"
if [[ ! -f "$KEY_FILE" ]]; then
  DB_ENC_KEY=$(cat "$SECRET_DIR/db_encryption_key.txt")
  printf '1;%s\n' "$DB_ENC_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  success "MariaDB encryption keyfile created"
fi

echo ""
info "Building images and starting containers (first run may take a few minutes)..."
echo ""

cd "$PROJECT_ROOT"
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""

# ── Health check ────────────────────────────────────────────────────────────────
info "Waiting for the backend to become healthy..."
max_attempts=30
attempt=0
until docker inspect budget_backend --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  attempt=$((attempt + 1))
  if [[ $attempt -ge $max_attempts ]]; then
    warn "Health check timed out. Check: docker logs budget_backend"
    break
  fi
  printf "  Attempt %d/%d...\r" "$attempt" "$max_attempts"
  sleep 5
done

# ── Summary ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  Setup complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${BOLD}Stack is running on port 3000.${RESET}"
echo ""
echo -e "  ${BOLD}Configure Nginx Proxy Manager:${RESET}"
echo -e "    1. Create a new Proxy Host for ${BOLD}${DOMAIN}${RESET}"
echo -e "    2. Forward to: ${BOLD}http://<this-host>:3000${RESET}"
echo -e "    3. Enable SSL + Let's Encrypt"
echo ""
echo -e "  Once NPM is configured, open ${BOLD}${APP_URL}${RESET}"
echo -e "  Your ${BOLD}master secret${RESET} will be displayed on the registration"
echo -e "  page — it will not be shown again after you register."
echo ""
echo -e "  Data:       ${DATA_DIR}"
echo -e "  Secrets:    ${SECRET_DIR}"
echo -e "  Master key: ${SECRET_DIR}/master_secret.txt"
echo ""
echo -e "  Useful commands:"
echo -e "    Logs:    docker compose -f docker/docker-compose.prod.yml logs -f"
echo -e "    Stop:    docker compose -f docker/docker-compose.prod.yml down"
echo -e "    Recover: ./scripts/setup/derive-secrets.sh <master-hex>"
echo ""
