#!/bin/bash
set -e

# BudgetApp — Disaster Recovery: Re-derive all secrets from master secret
#
# Usage:
#   ./scripts/setup/derive-secrets.sh <master-secret-hex>
#   ./scripts/setup/derive-secrets.sh  # reads from secrets/production/master_secret.txt
#
# This script regenerates all derived secret files under secrets/production/
# from the single master secret you saved during initial setup.
# Run this after restoring to a new host before starting the Docker stack.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRET_DIR="$PROJECT_ROOT/secrets/production"

# ── Colour helpers ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
success() { echo -e "${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✖${RESET}  $*" >&2; exit 1; }

echo -e "${BOLD}BudgetApp — Secret Re-derivation (Disaster Recovery)${RESET}"
echo ""

# ── Get master secret ──────────────────────────────────────────────────────────

MASTER_HEX="${1:-}"

if [[ -z "$MASTER_HEX" ]]; then
  MASTER_FILE="$SECRET_DIR/master_secret.txt"
  if [[ -f "$MASTER_FILE" ]]; then
    MASTER_HEX=$(cat "$MASTER_FILE")
    warn "No master secret supplied; reading from $MASTER_FILE"
  else
    error "Usage: $0 <master-secret-hex>\n  Provide the 64-character hex master secret you saved during setup."
  fi
fi

# Validate: must be exactly 64 hex chars
if ! [[ "$MASTER_HEX" =~ ^[0-9a-fA-F]{64}$ ]]; then
  error "Master secret must be exactly 64 hexadecimal characters (32 bytes)."
fi

echo "  Master secret: ${MASTER_HEX:0:8}…${MASTER_HEX: -8}  (64 chars)"
echo ""

# ── Derivation functions ───────────────────────────────────────────────────────

hex_to_bin() {
  local hex="$1"
  printf '%b' "$(printf '%s' "$hex" | sed 's/../\\x&/g')"
}

derive_hex() {
  printf '%s' "$1" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:${MASTER_HEX}" 2>/dev/null | awk '{print $NF}'
}

derive_base64() {
  hex_to_bin "$(derive_hex "$1")" | base64 | tr -d '\n'
}

derive_alnum32() {
  hex_to_bin "$(derive_hex "$1")" | base64 | tr -d '\n' | tr -cd 'A-Za-z0-9' | head -c 32
}

write_secret() {
  local filename="$1"
  local value="$2"
  mkdir -p "$SECRET_DIR"
  chmod 700 "$SECRET_DIR"
  printf '%s' "$value" > "$SECRET_DIR/$filename"
  chmod 600 "$SECRET_DIR/$filename"
}

# ── Re-derive all secrets ──────────────────────────────────────────────────────

echo "Re-deriving secrets into $SECRET_DIR ..."
echo ""

write_secret "master_secret.txt"          "$MASTER_HEX"
success "Written: master_secret.txt"

write_secret "jwt_secret.txt"             "$(derive_base64  'budgetapp:jwt-secret')"
success "Derived: jwt_secret.txt"

write_secret "encryption_key.txt"         "$(derive_hex     'budgetapp:encryption-key')"
success "Derived: encryption_key.txt"

write_secret "password_pepper.txt"        "$(derive_base64  'budgetapp:password-pepper')"
success "Derived: password_pepper.txt"

write_secret "backup_encryption_key.txt"  "$(derive_base64  'budgetapp:backup-encryption-key')"
success "Derived: backup_encryption_key.txt"

echo ""
warn "Database password NOT re-derived — it is your external MariaDB user password."
warn "You must manually create: secrets/production/db_password.txt"
warn "Contents: the password you chose when creating the budget_user in MariaDB."
echo ""
echo -e "${BOLD}${GREEN}Secrets re-derived successfully.${RESET}"
echo ""
echo "Next steps:"
echo "  1. Create db_password.txt with your MariaDB user password:"
echo "     printf '%s' 'your_db_password' > secrets/production/db_password.txt && chmod 600 secrets/production/db_password.txt"
echo "  2. Run the setup script to create directories and start the stack:"
echo "     ./scripts/setup/setup-prod.sh --domain <your-domain>"
echo "  3. Or, if directories already exist:"
echo "     docker compose -f docker/docker-compose.prod.yml up -d --build"
echo ""
