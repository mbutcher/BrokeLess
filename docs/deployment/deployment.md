# BudgetApp — Installation Guide

**Also available in:** [Français](deployment.fr-CA.md)

> **Who this is for:** Unraid users comfortable with the Terminal and Community Applications. No programming knowledge required.

---

## What You'll Need Before Starting

- **Unraid 6.12 or newer**
- **Docker Compose Manager** installed from Community Applications (search "Docker Compose Manager" by dcflachs)
- **Nginx Proxy Manager** installed from Community Applications (for access outside your home network)
- A domain name pointed at your home IP, or a local hostname like `budget.lan`

> **Database:** BudgetApp includes SQLite by default — no separate database server is required. If you prefer MariaDB or PostgreSQL, see Step 1b below.

---

## 1. Choose Your Database

### Option A — SQLite (default, recommended)

No action needed. BudgetApp stores its data in a single file at `/mnt/user/appdata/budget-app/data/budget.db` on your server. Skip ahead to **Step 2**.

### Option B — MariaDB (external)

Install MariaDB from Community Applications if you don't already have it. Once running, open a terminal and connect to it (or use Adminer), then run:

```sql
CREATE DATABASE IF NOT EXISTS budget_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'budget_user'@'%' IDENTIFIED BY 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON budget_app.* TO 'budget_user'@'%';
FLUSH PRIVILEGES;
```

Write down the password you chose — you'll need it during setup.

### Option C — PostgreSQL (external)

If you prefer PostgreSQL, connect to your server and run:

```sql
CREATE DATABASE budget_app;
CREATE USER budget_user WITH PASSWORD 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON DATABASE budget_app TO budget_user;
```

Write down the password — you'll need it during setup.

---

## 2. Install BudgetApp

Open an Unraid Terminal and run these three commands:

```bash
git clone https://github.com/mbutcher/BudgetApp /mnt/user/repos/BudgetApp
cd /mnt/user/repos/BudgetApp
./scripts/setup/setup-prod.sh
```

The setup script will ask for:
- Your domain name (e.g. `budget.yourdomain.com`)
- Whether you are using Nginx Proxy Manager
- The host port BudgetApp should listen on (default `13911` — change this if something else is already using it)
- Your database choice and credentials (if using MariaDB or PostgreSQL)

It will then generate your security keys, create the necessary folders, and start the app.

> **Optional:** Pass answers directly to skip prompts:
> ```bash
> ./scripts/setup/setup-prod.sh --domain budget.yourdomain.com --port 13911
> ```

---

## 3. Save Your Master Secret

The first time you open BudgetApp in a browser, you will see a screen asking you to save your **Master Secret** before you can create an account.

**This is the single most important step.** Your Master Secret is a long string of letters and numbers that protects all of your data. If you ever need to move BudgetApp to a new server, this is what you'll need to restore it.

1. Click **Copy** to copy the Master Secret to your clipboard.
2. Paste it into a password manager (1Password, Bitwarden, etc.) or write it down and store it somewhere safe.
3. Check the confirmation box and click **Continue** to proceed to account creation.

Once you dismiss this screen, the secret will never be shown again.

---

## 4. Set Up Nginx Proxy Manager (for external access)

If you want to access BudgetApp from outside your home network with a real domain name and HTTPS, configure a Proxy Host in Nginx Proxy Manager:

1. Open Nginx Proxy Manager and go to **Proxy Hosts → Add Proxy Host**.
2. Fill in the **Details** tab:
   - **Domain Names:** `budget.yourdomain.com`
   - **Forward Hostname / IP:** the IP address of your Unraid server
   - **Forward Port:** `13911`
   - Turn on **Websockets Support**
3. On the **SSL** tab:
   - Select **Request a new SSL Certificate**
   - Turn on **Force SSL**
4. On the **Advanced** tab, paste this into the custom Nginx configuration box:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
```

5. Click **Save**.

BudgetApp is now accessible at `https://budget.yourdomain.com`.

---

## 5. Backup

BudgetApp stores data in two places. Back up both regularly.

| What | Where |
|------|-------|
| Uploaded files and logs | `/mnt/user/appdata/budget-app/` |
| Master Secret | `secrets/production/master_secret.txt` (inside the BudgetApp repo folder) |
| Database | See below — depends on your database choice |

**The Master Secret file is tiny but critical.** Copy it somewhere off-server (a password manager, an encrypted USB drive, a second location). You can rebuild everything else from it.

For the app data folder, use Unraid's built-in backup tools or the **CA Backup / Restore** plugin to schedule regular copies to a share or external drive.

### Database backups

**SQLite (default):** The database is a single file. Back it up with CA Backup / Restore (include `/mnt/user/appdata/budget-app/data/`), or copy it manually:

```bash
cp /mnt/user/appdata/budget-app/data/budget.db \
   /mnt/user/backups/budget_$(date +%Y%m%d).db
```

**MariaDB:** Use your existing MariaDB backup process, or add a nightly script in User Scripts:

```bash
docker exec <your-mariadb-container> \
  sh -c 'mysqldump -u budget_user -p"your_db_password" \
    --single-transaction budget_app' \
  | gzip > /mnt/user/backups/budget_$(date +%Y%m%d).sql.gz
```

**PostgreSQL:** Similarly, add a nightly User Scripts entry:

```bash
docker exec <your-postgres-container> \
  pg_dump -U budget_user budget_app \
  | gzip > /mnt/user/backups/budget_$(date +%Y%m%d).sql.gz
```

---

## 6. Upgrade

```bash
cd /mnt/user/repos/BudgetApp
git pull
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Any database updates are applied automatically when the app starts back up.

---

## 7. Restore / Disaster Recovery

### Moving to a new server (or rebuilding after a failure)

1. Install Docker and Docker Compose Manager on the new server.
2. Clone the BudgetApp repository to the same path.
3. Restore your security keys from your Master Secret:

```bash
cd /mnt/user/repos/BudgetApp
./scripts/setup/derive-secrets.sh YOUR-MASTER-SECRET-HERE
```

4. Restore your database:

   **SQLite:** Copy your backup file back into place:
   ```bash
   mkdir -p /mnt/user/appdata/budget-app/data
   cp /mnt/user/backups/budget_YYYYMMDD.db \
      /mnt/user/appdata/budget-app/data/budget.db
   ```

   **MariaDB:** Recreate the database user (see Step 1 above), restore the dump, then create the password secret file:
   ```bash
   gunzip -c /mnt/user/backups/budget_YYYYMMDD.sql.gz \
     | docker exec -i <your-mariadb-container> \
       mysql -u budget_user -p budget_app
   printf '%s' 'your_db_password' > secrets/production/db_password.txt
   chmod 600 secrets/production/db_password.txt
   ```

   **PostgreSQL:** Similarly, restore the dump and create the password secret file:
   ```bash
   gunzip -c /mnt/user/backups/budget_YYYYMMDD.sql.gz \
     | docker exec -i <your-postgres-container> \
       psql -U budget_user -d budget_app
   printf '%s' 'your_db_password' > secrets/production/db_password.txt
   chmod 600 secrets/production/db_password.txt
   ```

5. Copy `secrets/production/.env` from your backup, or re-run `./scripts/setup/setup-prod.sh --domain <your-domain> --port <your-port>` to regenerate it.

6. Start the app:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Your data and settings will be exactly as you left them.

---

## Troubleshooting

### The app won't start

```bash
docker compose -f docker/docker-compose.prod.yml logs
```

Check the output for error messages. Common causes:

- **SQLite permission error** — verify the `/mnt/user/appdata/budget-app/data/` directory exists and is writable. Check it appears in the volumes section of `docker/docker-compose.prod.yml`.
- **Can't connect to external database** — if using `DB_CLIENT=mysql2` or `DB_CLIENT=pg`, verify the host address, port, and credentials in `secrets/production/.env`. Make sure the database container is running and the `budget_app` database exists.
- **Missing secret files** — run `./scripts/setup/setup-prod.sh` again from the repo folder.
- **Port 13911 already in use** — another container is using that port. Edit `APP_PORT` in `docker/.env` (e.g. change `13911` to a free port), then restart with `docker compose -f docker/docker-compose.prod.yml up -d`. Or re-run `./scripts/setup/setup-prod.sh --port <new-port>` to reconfigure everything at once.

### The app starts but I can't log in / WebAuthn errors

Make sure your domain name in Nginx Proxy Manager exactly matches the domain you used during setup. Mismatched hostnames will prevent passkey and security features from working.

### Check whether the app is running

```bash
docker compose -f docker/docker-compose.prod.yml ps
```

The `budget_app` container should show **Up (healthy)**.

### SSL certificate problems

SSL is managed entirely by Nginx Proxy Manager. If you're seeing certificate errors, check the certificate status in NPM's admin panel. Make sure the proxy host is forwarding to `http://` (not `https://`) — NPM handles the secure connection on its side.
