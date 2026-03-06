# PRD — Phase 9: Production Deployment Guide

**Version:** v0.3
**Priority:** Low
**Scope:** Small
**Status:** Ready for development

---

## Overview

Create a complete, step-by-step production deployment guide targeting Unraid with the Community Applications plugin. The guide covers Docker Compose production profile validation, TLS/HTTPS setup, MariaDB backup/restore procedures, and health check documentation.

---

## Problem Statement

The existing `docs/developer/deployment.md` exists but is incomplete — it covers the dev setup only. There is no authoritative guide for self-hosters who want to deploy BudgetApp on Unraid in production with proper TLS, persistent volumes, and data safety.

---

## Goals

- Step-by-step Unraid Community Application (CA) template setup
- Docker Compose production profile that is tested and validated
- HTTPS/TLS configuration via Nginx reverse proxy or Let's Encrypt
- MariaDB backup and restore procedure
- Health check endpoint documentation

## Non-Goals

- Non-Unraid hosting (AWS, VPS, etc.) — Unraid is the primary target
- Kubernetes deployment
- Automated backup scheduling (document the manual procedure + recommended cron approach)

---

## Deliverables

All deliverables are documentation files only — no code changes required unless gaps are found during validation.

### 9.1 Validate and Fix docker-compose.prod.yml

- Verify all service definitions are production-ready:
  - `restart: unless-stopped` on all services
  - No dev-only volumes or bind mounts
  - Named volumes for MariaDB data, Redis data, app uploads
  - Health checks on `mariadb`, `redis`, and `backend` services
  - Environment variable references to Docker secrets (`/run/secrets/*`)
  - `NODE_ENV=production` for backend
- Fix any issues found during validation

### 9.2 Unraid CA Template

An Unraid Community Application template is an XML file that configures the container in the Unraid UI. Document what fields to fill in or provide a template file:

- **Template location:** `unraid/budgetapp.xml` (or inline in docs)
- Required configuration:
  - Repository: image URL
  - Network mode: bridge (recommended for Unraid)
  - Port mappings
  - Volume path mappings (appdata, MariaDB data, Redis data)
  - Environment variables (with descriptions)
  - Docker secrets setup (or ENV fallback for simpler deployments)

### 9.3 TLS / HTTPS

Two paths documented:

**Option A — Nginx Proxy Manager (most common on Unraid)**
- Install NPM as a separate Unraid container
- Create proxy host pointing to BudgetApp backend
- Configure Let's Encrypt certificate with DuckDNS or Cloudflare DNS challenge

**Option B — Traefik (for users already running Traefik)**
- Add Traefik labels to `docker-compose.prod.yml`
- Let's Encrypt ACME resolver configuration

Document `CORS_ORIGIN` and `FRONTEND_URL` env vars that must match the production domain.

### 9.4 MariaDB Backup & Restore

**Backup:**
```bash
docker exec budget_mariadb_prod mysqldump \
  -u budgetapp -p<password> budgetapp \
  > backup-$(date +%Y%m%d).sql
```

- Recommended: Unraid's built-in backup plugin or a nightly cron job using the above command
- Backup file should be stored outside the Docker volume (e.g., `/mnt/user/backups/budgetapp/`)

**Restore:**
```bash
docker exec -i budget_mariadb_prod mysql \
  -u budgetapp -p<password> budgetapp \
  < backup-20260101.sql
```

- Document the stop-services → restore → start-services sequence
- Verify restore by checking `SELECT COUNT(*) FROM transactions`

### 9.5 Health Check Documentation

`GET /health` endpoint — document expected response:

```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "version": "0.3.0",
  "uptime": 3600
}
```

- Response codes: `200 OK` (healthy), `503 Service Unavailable` (degraded)
- How to integrate with Unraid's container health monitoring
- How to integrate with Nginx Proxy Manager's health check URL

### 9.6 Secrets Management

Document two approaches:

**Docker Secrets (recommended for security):**
- `docker secret create` for each secret
- `docker-compose.prod.yml` service references `secrets:` block
- Secrets available at `/run/secrets/<name>` inside containers

**Environment File Fallback (simpler for single-node Unraid):**
- `.env.prod` file with all secrets (chmod 600)
- `env_file` in compose service definition
- Trade-off: less secure, but easier for beginners

---

## Documentation Structure

Update/replace `docs/developer/deployment.md`:

```
# BudgetApp — Production Deployment Guide

## Prerequisites
## Quick Start (Unraid CA Template)
## Step 1: Prepare Secrets
## Step 2: Configure docker-compose.prod.yml
## Step 3: First Run
## Step 4: Configure HTTPS
  ### Option A: Nginx Proxy Manager
  ### Option B: Traefik
## Step 5: Verify Health
## Backup & Restore
  ### Automated Backup (Recommended)
  ### Manual Backup
  ### Restore Procedure
## Troubleshooting
  ### Container won't start
  ### Database connection errors
  ### Auth / cookie issues behind reverse proxy
## Environment Variables Reference
## Upgrading BudgetApp
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `docker-compose.prod.yml` starts all services cleanly in a clean environment |
| AC-2 | `GET /health` returns `200 OK` with all components connected |
| AC-3 | Deployment guide covers all steps from zero to a working HTTPS instance |
| AC-4 | Backup procedure creates a restorable SQL file |
| AC-5 | Restore procedure returns the app to a working state from backup |
| AC-6 | Document covers both NPM and Traefik TLS options |
| AC-7 | All referenced environment variables are described in the reference table |

---

## Dependencies

- `docker/docker-compose.prod.yml` must exist and be in a reasonable state
- Backend `GET /health` endpoint must be implemented (verify it exists)

## Out of Scope

- Automated backup scheduling implementation
- Monitoring / alerting setup (Prometheus, Grafana)
- Multi-node / high-availability deployment
