#!/bin/bash
set -e

# Script to generate encryption keys and secrets for Budget App
# Usage: ./generate-keys.sh <environment>
# Example: ./generate-keys.sh development
#          ./generate-keys.sh production
#
# Production mode: generates ONE master secret and derives all sub-keys from it
# deterministically using HMAC-SHA256 (a standard KDF pattern).
# The master secret is the only value that needs to be backed up.
#
# Development mode: generates independent random secrets (simpler, no backup needed).

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRET_DIR="$PROJECT_ROOT/secrets/$ENVIRONMENT"

echo "🔐 Generating secrets for $ENVIRONMENT environment..."
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
  echo "❌ Error: Environment must be 'development' or 'production'"
  echo "Usage: ./generate-keys.sh <development|production>"
  exit 1
fi

# Create secrets directory
mkdir -p "$SECRET_DIR"
chmod 700 "$SECRET_DIR"
echo "📁 Created directory: $SECRET_DIR"

# ─── Helper functions ──────────────────────────────────────────────────────────

write_secret() {
  local filename="$1"
  local value="$2"
  local filepath="$SECRET_DIR/$filename"
  printf '%s' "$value" > "$filepath"
  chmod 600 "$filepath"
}

# Convert a hex string to raw binary (pure bash + printf; no xxd required)
hex_to_bin() {
  local hex="$1"
  printf '%b' "$(printf '%s' "$hex" | sed 's/../\\x&/g')"
}

# ─── Production: master secret + derived sub-keys ─────────────────────────────

generate_production_secrets() {
  local master_file="$SECRET_DIR/master_secret.txt"

  # Generate master secret only if it doesn't already exist
  if [[ ! -f "$master_file" ]]; then
    openssl rand -hex 32 > "$master_file"
    chmod 600 "$master_file"
    echo "✅ Generated: master_secret.txt (NEW)"
  else
    echo "⚠️  master_secret.txt already exists — re-deriving all sub-keys from it"
  fi

  local master_hex
  master_hex=$(cat "$master_file")

  # Derive HMAC-SHA256(key=master_secret_bytes, msg=label) for each sub-key.
  # The info label namespaces each derived key so they are cryptographically
  # independent even though they share the same master secret.
  derive_hex() {
    # Returns 64 hex chars (32 bytes)
    printf '%s' "$1" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:${master_hex}" 2>/dev/null | awk '{print $NF}'
  }

  derive_base64() {
    # Returns base64 of 32 derived bytes
    hex_to_bin "$(derive_hex "$1")" | base64 | tr -d '\n'
  }

  derive_alnum32() {
    # Returns 32 alphanumeric chars suitable for passwords
    hex_to_bin "$(derive_hex "$1")" | base64 | tr -d '\n' | tr -cd 'A-Za-z0-9' | head -c 32
  }

  echo ""
  echo "Deriving all sub-keys from master secret..."

  write_secret "jwt_secret.txt"            "$(derive_base64  'budgetapp:jwt-secret')"
  echo "✅ Derived: jwt_secret.txt"

  write_secret "encryption_key.txt"        "$(derive_hex     'budgetapp:encryption-key')"
  echo "✅ Derived: encryption_key.txt"

  write_secret "password_pepper.txt"       "$(derive_base64  'budgetapp:password-pepper')"
  echo "✅ Derived: password_pepper.txt"

  write_secret "backup_encryption_key.txt" "$(derive_base64  'budgetapp:backup-encryption-key')"
  echo "✅ Derived: backup_encryption_key.txt"
}

# ─── Development: independent random secrets ──────────────────────────────────

# Helper — generate and save a random secret (idempotent: skips if file exists)
generate_secret() {
  local filename=$1
  local method=$2
  local length=$3
  local filepath="$SECRET_DIR/$filename"

  if [[ -f "$filepath" ]]; then
    echo "⚠️  $filename already exists, skipping..."
    return
  fi

  case $method in
    base64)       openssl rand -base64 "$length" > "$filepath" ;;
    hex)          openssl rand -hex "$length" > "$filepath" ;;
    alphanumeric) LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$length" > "$filepath" ;;
  esac

  chmod 600 "$filepath"
  echo "✅ Generated: $filename"
}

generate_development_secrets() {
  echo ""
  echo "Generating authentication secrets..."
  generate_secret "jwt_secret.txt" "base64" 64
  generate_secret "password_pepper.txt" "base64" 32

  echo ""
  echo "Generating encryption keys..."
  generate_secret "encryption_key.txt" "hex" 32

  echo ""
  echo "Generating database credentials..."
  generate_secret "db_password.txt" "alphanumeric" 32
}

# ─── Run ──────────────────────────────────────────────────────────────────────

if [[ "$ENVIRONMENT" == "production" ]]; then
  generate_production_secrets
else
  generate_development_secrets
fi

# ─── .env file ────────────────────────────────────────────────────────────────

ENV_FILE="$SECRET_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "Creating $ENVIRONMENT .env file..."
  cp "$PROJECT_ROOT/secrets/.env.example" "$ENV_FILE"

  if [[ "$ENVIRONMENT" == "development" ]]; then
    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=development/' "$ENV_FILE"
    sed -i.bak 's|APP_URL=.*|APP_URL=http://localhost:3000|' "$ENV_FILE"
    sed -i.bak 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:3000|' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_RP_ID=.*/WEBAUTHN_RP_ID=localhost/' "$ENV_FILE"
    sed -i.bak 's|WEBAUTHN_ORIGIN=.*|WEBAUTHN_ORIGIN=http://localhost:3000|' "$ENV_FILE"
    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' "$ENV_FILE"
  else
    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
    sed -i.bak 's|APP_URL=.*|APP_URL=https://budget.local|' "$ENV_FILE"
    sed -i.bak 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://budget.local|' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_RP_ID=.*/WEBAUTHN_RP_ID=budget.local/' "$ENV_FILE"
    sed -i.bak 's|WEBAUTHN_ORIGIN=.*|WEBAUTHN_ORIGIN=https://budget.local|' "$ENV_FILE"
    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=info/' "$ENV_FILE"
  fi

  rm -f "$ENV_FILE.bak"
  chmod 600 "$ENV_FILE"
  echo "✅ Created: .env"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secret generation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Secrets location: $SECRET_DIR"
echo "🔒 All files have 600 permissions (owner read/write only)"
echo ""

if [[ "$ENVIRONMENT" == "production" ]]; then
  echo "🔑 MASTER SECRET: $SECRET_DIR/master_secret.txt"
  echo "   This is the only file you need to back up."
  echo "   All other secrets are derived from it and can be regenerated."
  echo ""
  echo "⚠️  IMPORTANT:"
  echo "   1. Never commit secrets/ to version control"
  echo "   2. Back up master_secret.txt to encrypted external storage"
  echo "   3. To recover secrets: ./scripts/setup/derive-secrets.sh <master-hex>"
  echo ""
fi

echo "🚀 You can now start the $ENVIRONMENT environment!"
echo ""
