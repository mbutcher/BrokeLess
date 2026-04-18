#!/bin/bash
# BudgetApp — Production Update Script
# Pulls the latest code from main, rebuilds the Docker image, runs any pending
# migrations, and restarts the container with zero data loss.
#
# Usage:
#   ./scripts/setup/update-prod.sh
#   ./scripts/setup/update-prod.sh --skip-pull   # skip git pull (use local code)
#
# Run this from the project root on your Unraid server:
#   cd /mnt/user/repos/BudgetApp && ./scripts/setup/update-prod.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.prod.yml"
COMPOSE_ENV_FILE="$PROJECT_ROOT/docker/.env"
CONTAINER_NAME="budget_app"

SKIP_PULL=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pull) SKIP_PULL=true; shift ;;
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

# ── Banner ────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      BudgetApp — Production Update       ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"

# ── Preflight ─────────────────────────────────────────────────────────────────────
header "Preflight checks"

command -v docker  &>/dev/null || error "Docker is not installed."
docker compose version &>/dev/null || error "Docker Compose v2 is not available."

[[ -f "$COMPOSE_FILE" ]]     || error "docker-compose.prod.yml not found. Run this from the repo root."
[[ -f "$COMPOSE_ENV_FILE" ]] || error "docker/.env not found. Has setup-prod.sh been run?"
[[ -d "$PROJECT_ROOT/secrets/production" ]] || error "secrets/production/ not found. Has setup-prod.sh been run?"

success "Docker and Compose available"
success "Production config present"

# ── Record current version for the changelog ──────────────────────────────────────
PREVIOUS_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

# ── 1. Pull latest code ───────────────────────────────────────────────────────────
header "Step 1 — Pulling latest code from main"

cd "$PROJECT_ROOT"

if [[ "$SKIP_PULL" == true ]]; then
  warn "--skip-pull set; using local code at $(git rev-parse --short HEAD)"
else
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    warn "Current branch is '${CURRENT_BRANCH}', switching to main..."
    git checkout main
  fi
  git pull origin main
  success "Code updated to $(git rev-parse --short HEAD)"
fi

NEW_COMMIT="$(git rev-parse --short HEAD)"

if [[ "$PREVIOUS_COMMIT" == "$NEW_COMMIT" ]] && [[ "$SKIP_PULL" == false ]]; then
  echo ""
  info "Already up to date (${NEW_COMMIT}). Rebuild anyway? [y/N]"
  read -r REBUILD_ANYWAY || true
  if [[ ! "${REBUILD_ANYWAY,,}" =~ ^y ]]; then
    info "Nothing to do."
    exit 0
  fi
fi

# ── 2. Build new image ────────────────────────────────────────────────────────────
header "Step 2 — Building Docker image"

info "Building image from ${NEW_COMMIT} (this may take a few minutes)..."
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" build --no-cache
success "Image built successfully"

# ── 3. Restart container ──────────────────────────────────────────────────────────
header "Step 3 — Restarting container"

info "Stopping old container..."
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" down

info "Starting new container..."
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" up -d
success "Container started"

# ── 4. Run migrations ─────────────────────────────────────────────────────────────
header "Step 4 — Running database migrations"

# Wait briefly for the app to initialise before running migrate
sleep 5

if docker exec "$CONTAINER_NAME" npm run migrate 2>&1; then
  success "Migrations complete"
else
  warn "Migration command returned non-zero. Check logs:"
  warn "  docker logs ${CONTAINER_NAME}"
fi

# ── 5. Health check ───────────────────────────────────────────────────────────────
header "Step 5 — Health check"

info "Waiting for container to become healthy..."
max_attempts=30
attempt=0
until docker inspect "$CONTAINER_NAME" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  attempt=$((attempt + 1))
  if [[ $attempt -ge $max_attempts ]]; then
    warn "Health check timed out after $((max_attempts * 5))s."
    warn "The app may still be starting. Check: docker logs ${CONTAINER_NAME}"
    break
  fi
  printf "  Waiting... %d/%d\r" "$attempt" "$max_attempts"
  sleep 5
done

if docker inspect "$CONTAINER_NAME" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
  success "Container is healthy"
fi

# ── Summary ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${GREEN}  Update complete!${RESET}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${PREVIOUS_COMMIT} → ${BOLD}${NEW_COMMIT}${RESET}"
echo ""
echo "  Useful commands:"
echo "    Logs:    docker logs -f ${CONTAINER_NAME}"
echo "    Status:  docker inspect ${CONTAINER_NAME} --format '{{.State.Health.Status}}'"
echo "    Shell:   docker exec -it ${CONTAINER_NAME} sh"
echo ""
