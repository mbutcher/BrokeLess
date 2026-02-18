#!/bin/bash
set -e

# Script to generate self-signed SSL certificate for Budget App
# Usage: ./generate-ssl-cert.sh [domain] [days] [ip_address]
# Example: ./generate-ssl-cert.sh budget.local 3650 192.168.1.100

DOMAIN="${1:-budget.local}"
DAYS="${2:-3650}"  # Default 10 years

# Try to auto-detect local IP address if not provided
if [[ -n "$3" ]]; then
  SERVER_IP="$3"
else
  # Try to detect the primary local IP (works on macOS and Linux)
  if command -v ipconfig >/dev/null 2>&1; then
    # macOS
    SERVER_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  elif command -v hostname >/dev/null 2>&1; then
    # Linux
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
  fi

  # Fallback to empty if detection failed
  if [[ -z "$SERVER_IP" ]]; then
    echo "⚠️  Could not auto-detect IP address. Certificate will only include localhost."
    echo "   To include a specific IP, run: $0 $DOMAIN $DAYS <your-ip-address>"
    echo ""
    read -p "Press Enter to continue with localhost only, or Ctrl+C to abort: "
    echo ""
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SSL_DIR="$PROJECT_ROOT/docker/ssl"

echo "🔐 Generating SSL certificate for Budget App"
echo ""
echo "Domain: $DOMAIN"
echo "Valid for: $DAYS days (~$((DAYS/365)) years)"
if [[ -n "$SERVER_IP" ]]; then
  echo "IP Address: $SERVER_IP"
fi
echo ""

# Create SSL directory
mkdir -p "$SSL_DIR"
echo "📁 Created directory: $SSL_DIR"
echo ""

# Check if certificate already exists
if [[ -f "$SSL_DIR/certificate.crt" ]] && [[ -f "$SSL_DIR/private.key" ]]; then
  echo "⚠️  SSL certificate already exists!"
  echo ""
  read -p "Do you want to regenerate it? This will overwrite existing certificates. (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted. Existing certificates preserved."
    exit 0
  fi
  echo ""
fi

# Generate private key
echo "🔑 Generating private key (4096-bit RSA)..."
openssl genrsa -out "$SSL_DIR/private.key" 4096 2>/dev/null
chmod 600 "$SSL_DIR/private.key"
echo "✅ Private key generated"
echo ""

# Generate certificate signing request (CSR)
echo "📝 Generating certificate signing request..."
openssl req -new \
  -key "$SSL_DIR/private.key" \
  -out "$SSL_DIR/cert.csr" \
  -subj "/C=US/ST=State/L=City/O=Personal/CN=$DOMAIN" \
  2>/dev/null
echo "✅ CSR generated"
echo ""

# Create OpenSSL config for SAN (Subject Alternative Names)
# Build the alt_names section dynamically based on whether SERVER_IP is provided
ALT_NAMES_CONFIG="DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.${DOMAIN}
IP.1 = 127.0.0.1"

if [[ -n "$SERVER_IP" ]]; then
  ALT_NAMES_CONFIG="${ALT_NAMES_CONFIG}
IP.2 = $SERVER_IP"
fi

cat > "$SSL_DIR/openssl.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Personal
CN = $DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
$ALT_NAMES_CONFIG
EOF

# Generate self-signed certificate
echo "📜 Generating self-signed certificate..."
openssl x509 -req \
  -days "$DAYS" \
  -in "$SSL_DIR/cert.csr" \
  -signkey "$SSL_DIR/private.key" \
  -out "$SSL_DIR/certificate.crt" \
  -extensions v3_req \
  -extfile "$SSL_DIR/openssl.cnf" \
  2>/dev/null
chmod 644 "$SSL_DIR/certificate.crt"
echo "✅ Certificate generated"
echo ""

# Generate Diffie-Hellman parameters for stronger security
echo "🔐 Generating Diffie-Hellman parameters (2048-bit)..."
echo "   This may take a few minutes..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048 2>/dev/null
chmod 644 "$SSL_DIR/dhparam.pem"
echo "✅ DH parameters generated"
echo ""

# Clean up temporary files
rm -f "$SSL_DIR/cert.csr" "$SSL_DIR/openssl.cnf"

# Display certificate information
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SSL certificate generated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Certificate location: $SSL_DIR"
echo ""
echo "📄 Files created:"
echo "   - certificate.crt (public certificate)"
echo "   - private.key (private key - keep secure!)"
echo "   - dhparam.pem (DH parameters)"
echo ""
echo "📋 Certificate details:"
openssl x509 -in "$SSL_DIR/certificate.crt" -noout -subject -dates -ext subjectAltName
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Trust the certificate on your devices"
echo ""
echo "📱 macOS/iOS:"
echo "   1. Open certificate: open $SSL_DIR/certificate.crt"
echo "   2. Add to Keychain and mark as trusted"
echo ""
echo "🪟 Windows:"
echo "   1. Double-click certificate"
echo "   2. Install to 'Trusted Root Certification Authorities'"
echo ""
echo "🐧 Linux:"
echo "   sudo cp $SSL_DIR/certificate.crt /usr/local/share/ca-certificates/budget-app.crt"
echo "   sudo update-ca-certificates"
echo ""
echo "🌐 Browsers:"
echo "   Chrome/Edge: Settings → Privacy → Certificates → Import"
echo "   Firefox: Settings → Privacy → Certificates → View → Import"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# For production deployment
if [[ "$SSL_DIR" == *"docker/ssl"* ]]; then
  echo "📝 For Unraid deployment:"
  echo "   Copy certificates to: /mnt/user/appdata/budget-app/ssl/"
  echo ""
  echo "   scp -r $SSL_DIR/* user@unraid:/mnt/user/appdata/budget-app/ssl/"
  echo ""
fi

echo "🚀 SSL setup complete! You can now run the application with HTTPS."
echo ""
