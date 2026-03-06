# Secrets Management

This directory contains sensitive configuration files and encryption keys. **All files in this directory (except this README) are git-ignored** and should never be committed to version control.

## Directory Structure

```
secrets/
├── development/          # Development environment secrets
│   ├── .env
│   ├── db_password.txt
│   ├── jwt_secret.txt
│   ├── encryption_key.txt
│   └── simplefin_token.txt
├── production/           # Production environment secrets
│   ├── .env
│   ├── .env.db
│   ├── db_password.txt
│   ├── db_root_password.txt
│   ├── db_encryption_key.txt
│   ├── jwt_secret.txt
│   ├── encryption_key.txt
│   ├── simplefin_token.txt
│   └── password_pepper.txt
├── .env.example          # Template for environment variables
└── README.md             # This file
```

## Generating Secrets

### Development Environment

```bash
./scripts/setup/generate-keys.sh development
```

This will create all necessary secrets in `secrets/development/` with appropriate randomness and permissions.

### Production Environment

```bash
./scripts/setup/generate-keys.sh production
```

This will create all necessary secrets in `secrets/production/` including additional production-only secrets like root database passwords.

## Secret Files

### `.env`
Main environment configuration file containing non-sensitive settings and references to secret files.

### `db_password.txt`
Database user password (32+ random characters).

### `db_root_password.txt` (production only)
Database root password (32+ random characters).

### `db_encryption_key.txt` (production only)
MariaDB table-level encryption key (64 hex characters).

### `jwt_secret.txt`
Secret for signing JWT tokens (base64, 512 bits).

### `encryption_key.txt`
Master encryption key for field-level encryption (256 bits hex).

### `password_pepper.txt`
Additional secret added to password hashes (base64, 256 bits).

### `simplefin_token.txt`
SimpleFIN Bridge access token (provided by SimpleFIN setup).

## Security Best Practices

1. **Never commit secrets**: All secret files are git-ignored. Never override this.

2. **Use strong randomness**: All secrets are generated using `openssl rand` for cryptographically secure random data.

3. **Restrict permissions**: Secret files should have 600 permissions (owner read/write only):
   ```bash
   chmod 600 secrets/development/*
   ```

4. **Backup securely**: Production secrets should be backed up to encrypted storage separate from the application.

5. **Rotate regularly**:
   - JWT secrets: Every 90 days
   - Encryption keys: Every 90 days (with key rotation service)
   - Database passwords: Annually or on suspected compromise

6. **Environment separation**: Never use development secrets in production or vice versa.

## Production Deployment

For Unraid deployment, secrets are stored at:
```
/mnt/user/appdata/budget-app/secrets/
```

With permissions:
```bash
chmod 700 /mnt/user/appdata/budget-app/secrets/
chmod 600 /mnt/user/appdata/budget-app/secrets/*
```

## Docker Secrets

In production, secrets are mounted via Docker secrets (read-only at `/run/secrets/`):

```yaml
secrets:
  db_password:
    file: ./secrets/production/db_password.txt
  jwt_secret:
    file: ./secrets/production/jwt_secret.txt
  encryption_key:
    file: ./secrets/production/encryption_key.txt
```

## Troubleshooting

### Missing Secrets
If you see "secret file not found" errors, run the key generation script:
```bash
./scripts/setup/generate-keys.sh <environment>
```

### Permission Errors
Fix permissions:
```bash
chmod 600 secrets/<environment>/*
```

### Lost Production Secrets
If production secrets are lost, you must:
1. Restore from encrypted backup
2. If no backup exists, you'll need to reset the application (all encrypted data will be lost)

This is why **backing up production secrets** is critical!

## Key Rotation

### JWT Secret

1. Generate a new secret: `openssl rand -base64 64 > secrets/production/jwt_secret.txt`
2. Restart the backend: `docker compose -f docker/docker-compose.prod.yml restart backend`

All existing sessions are immediately invalidated — users will need to log in again.

### Database Password

1. Generate a new password: `openssl rand -base64 32 > secrets/production/db_password.txt`
2. Update the password inside MariaDB:
   ```bash
   docker exec -it budget_mariadb \
     sh -c 'mysql -u root -p"$(cat /run/secrets/db_root_password)" -e \
     "ALTER USER '\''budget_user'\''@'\''%'\'' IDENTIFIED BY '\''<new-password>'\'';"'
   ```
3. Restart the backend: `docker compose -f docker/docker-compose.prod.yml restart backend`

### Encryption Key

> **Note:** Rotating the AES-256-GCM field-level encryption key requires re-encrypting all encrypted database fields (emails, payees, descriptions, notes). A migration tool for this has not been implemented yet. Until it is, treat the encryption key as a long-lived credential — protect it accordingly and store the backup in encrypted storage separate from the database.

### Password Pepper

> **Note:** Rotating the password pepper invalidates all existing password hashes — every user must reset their password. Treat this as a break-glass procedure only (e.g., confirmed pepper compromise).
