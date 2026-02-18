#!/bin/bash
set -e

# Script to generate encryption keys and secrets for Budget App
# Usage: ./generate-keys.sh <environment>
# Example: ./generate-keys.sh development

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
echo "📁 Created directory: $SECRET_DIR"

# Function to generate and save secret
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
    base64)
      openssl rand -base64 "$length" > "$filepath"
      ;;
    hex)
      openssl rand -hex "$length" > "$filepath"
      ;;
    alphanumeric)
      LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$length" > "$filepath"
      ;;
  esac

  chmod 600 "$filepath"
  echo "✅ Generated: $filename"
}

# Generate common secrets
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

# Production-specific secrets
if [[ "$ENVIRONMENT" == "production" ]]; then
  echo ""
  echo "Generating production-specific secrets..."
  generate_secret "db_root_password.txt" "alphanumeric" 32
  generate_secret "db_encryption_key.txt" "hex" 32
  generate_secret "redis_password.txt" "alphanumeric" 32
  generate_secret "backup_encryption_key.txt" "base64" 32
fi

# Create .env file if it doesn't exist
ENV_FILE="$SECRET_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "Creating $ENVIRONMENT .env file..."
  cp "$PROJECT_ROOT/secrets/.env.example" "$ENV_FILE"

  # Update environment-specific values
  if [[ "$ENVIRONMENT" == "development" ]]; then
    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=development/' "$ENV_FILE"
    sed -i.bak 's/APP_URL=.*/APP_URL=http:\/\/localhost:3000/' "$ENV_FILE"
    sed -i.bak 's/CORS_ORIGIN=.*/CORS_ORIGIN=http:\/\/localhost:3000/' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_RP_ID=.*/WEBAUTHN_RP_ID=localhost/' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_ORIGIN=.*/WEBAUTHN_ORIGIN=http:\/\/localhost:3000/' "$ENV_FILE"
    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' "$ENV_FILE"
  else
    sed -i.bak 's/NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
    sed -i.bak 's/APP_URL=.*/APP_URL=https:\/\/budget.local/' "$ENV_FILE"
    sed -i.bak 's/CORS_ORIGIN=.*/CORS_ORIGIN=https:\/\/budget.local/' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_RP_ID=.*/WEBAUTHN_RP_ID=budget.local/' "$ENV_FILE"
    sed -i.bak 's/WEBAUTHN_ORIGIN=.*/WEBAUTHN_ORIGIN=https:\/\/budget.local/' "$ENV_FILE"
    sed -i.bak 's/LOG_LEVEL=.*/LOG_LEVEL=info/' "$ENV_FILE"
  fi

  # Remove backup file
  rm -f "$ENV_FILE.bak"

  chmod 600 "$ENV_FILE"
  echo "✅ Created: .env"
fi

# Create .env.db for production
if [[ "$ENVIRONMENT" == "production" ]]; then
  ENV_DB_FILE="$SECRET_DIR/.env.db"
  if [[ ! -f "$ENV_DB_FILE" ]]; then
    echo ""
    echo "Creating production database .env file..."
    cat > "$ENV_DB_FILE" <<EOF
MYSQL_ROOT_PASSWORD_FILE=/run/secrets/db_root_password
MYSQL_DATABASE=budget_app
MYSQL_USER=budget_user
MYSQL_PASSWORD_FILE=/run/secrets/db_password
TZ=America/New_York
EOF
    chmod 600 "$ENV_DB_FILE"
    echo "✅ Created: .env.db"
  fi
fi

# Set directory permissions
chmod 700 "$SECRET_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Secret generation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Secrets location: $SECRET_DIR"
echo "🔒 All files have 600 permissions (owner read/write only)"
echo ""
echo "⚠️  IMPORTANT SECURITY REMINDERS:"
echo "   1. Never commit these files to version control"
echo "   2. Backup production secrets to encrypted external storage"
echo "   3. Rotate keys every 90 days in production"
echo "   4. Use different secrets for each environment"
echo ""

if [[ "$ENVIRONMENT" == "production" ]]; then
  echo "📝 Next steps for production:"
  echo "   1. Copy secrets to Unraid: scp -r $SECRET_DIR user@unraid:/mnt/user/appdata/budget-app/secrets/"
  echo "   2. Verify permissions on Unraid: chmod 700 /mnt/user/appdata/budget-app/secrets/"
  echo "   3. Generate SSL certificates: ./scripts/setup/generate-ssl-cert.sh"
  echo ""
fi

echo "🚀 You can now start the $ENVIRONMENT environment!"
echo ""
