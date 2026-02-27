# BudgetApp Load Tests

[k6](https://k6.io/) load test scenarios for BudgetApp backend endpoints.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

The backend must be running with seeded test data (`npm run seed:dev` in `backend/`).

## Scenarios

| File | What it tests | Primary metric |
|------|---------------|----------------|
| `scenarios/auth.js` | Login, token refresh, logout | `login_duration_ms` |
| `scenarios/transactions.js` | Paginated list, create/update/delete | `create_duration_ms` |
| `scenarios/reports.js` | Monthly summary, forecast, net worth, category spend | `monthly_summary_ms` |

## Running

```bash
# Single scenario
k6 run load-tests/scenarios/auth.js
k6 run load-tests/scenarios/transactions.js
k6 run load-tests/scenarios/reports.js

# Against a different host (e.g. staging)
BASE_URL=https://budget.example.com/api/v1 k6 run load-tests/scenarios/transactions.js

# With custom credentials
TEST_EMAIL=me@example.com TEST_PASSWORD=secret k6 run load-tests/scenarios/auth.js

# Output results to JSON for archiving
k6 run --out json=results.json load-tests/scenarios/transactions.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3001/api/v1` | API base URL |
| `TEST_EMAIL` | `alpha@test.local` | Test user email (from dev seed) |
| `TEST_PASSWORD` | `test123` | Test user password |

## Thresholds

Each scenario defines pass/fail thresholds:

- **Error rate** `< 1%` on all requests
- **p(95) response time** `< 2 s` for auth and transaction endpoints
- **p(95) response time** `< 3 s` for report endpoints (aggregation queries)

The test run exits with a non-zero code if any threshold is breached, making it
suitable for use in CI pipelines.

## Baseline Results (Unraid single-instance target)

Run these after any significant backend change to detect regressions:

```bash
k6 run load-tests/scenarios/transactions.js 2>&1 | tee load-tests/baseline-transactions.txt
```

Expected baseline for a local dev machine (Docker, seeded data):

| Metric | Target |
|--------|--------|
| Login p(95) | < 500 ms |
| Transaction create p(95) | < 300 ms |
| Monthly summary p(95) | < 800 ms |
| Error rate | 0% |
