/**
 * k6 load test: Transaction import endpoint (primary debt item)
 * and core CRUD flow.
 *
 * Tests: list transactions, create transaction, update, delete
 * Run: k6 run load-tests/scenarios/transactions.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const createErrors = new Rate('create_errors');
const listDuration  = new Trend('list_duration_ms', true);
const createDuration = new Trend('create_duration_ms', true);

export const options = {
  scenarios: {
    steady_read: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'readScenario',
    },
    burst_write: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 5  },
        { duration: '1m',  target: 10 },
        { duration: '30s', target: 0  },
      ],
      preAllocatedVUs: 20,
      exec: 'writeScenario',
    },
  },
  thresholds: {
    http_req_failed:    ['rate<0.01'],
    create_errors:      ['rate<0.01'],
    list_duration_ms:   ['p(95)<1500'],
    create_duration_ms: ['p(95)<2000'],
    http_req_duration:  ['p(95)<2000'],
  },
};

const BASE_URL       = __ENV.BASE_URL       || 'http://localhost:3001/api/v1';
const TEST_EMAIL     = __ENV.TEST_EMAIL     || 'alpha@test.local';
const TEST_PASSWORD  = __ENV.TEST_PASSWORD  || 'test123';

// ─── Shared login helper ────────────────────────────────────────────────────
function login() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) return null;
  return JSON.parse(res.body).data?.accessToken ?? null;
}

// ─── Read scenario: paginated list ─────────────────────────────────────────
export function readScenario() {
  const token = login();
  if (!token) { sleep(2); return; }

  const headers = {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };

  // Page 1, 50 per page
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/transactions?page=1&limit=50`, headers);
  listDuration.add(Date.now() - listStart);

  check(listRes, {
    'list status 200': (r) => r.status === 200,
    'list returns data array': (r) => {
      try { return Array.isArray(JSON.parse(r.body).data?.data); } catch { return false; }
    },
  });

  sleep(1);

  // Page 2
  http.get(`${BASE_URL}/transactions?page=2&limit=50`, headers);
  sleep(1);
}

// ─── Write scenario: create → update → delete ──────────────────────────────
export function writeScenario() {
  const token = login();
  if (!token) { sleep(2); return; }

  const headers = {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };

  // Fetch first account to use as target
  const accountsRes = http.get(`${BASE_URL}/accounts`, headers);
  if (accountsRes.status !== 200) { sleep(1); return; }
  const accounts = JSON.parse(accountsRes.body).data?.accounts ?? [];
  if (accounts.length === 0) { sleep(1); return; }
  const accountId = accounts[0].id;

  // Create
  const createStart = Date.now();
  const createRes = http.post(
    `${BASE_URL}/transactions`,
    JSON.stringify({
      accountId,
      amount: -12.34,
      date: new Date().toISOString().split('T')[0],
      payee: 'k6 load test',
      description: 'Automated load test transaction',
    }),
    headers,
  );
  createDuration.add(Date.now() - createStart);

  const createOk = check(createRes, {
    'create status 201': (r) => r.status === 201,
  });
  createErrors.add(!createOk);

  if (!createOk) { sleep(1); return; }

  const txId = JSON.parse(createRes.body).data?.transaction?.id;
  if (!txId) { sleep(1); return; }

  sleep(0.5);

  // Update
  const updateRes = http.patch(
    `${BASE_URL}/transactions/${txId}`,
    JSON.stringify({ description: 'k6 updated' }),
    headers,
  );
  check(updateRes, { 'update status 200': (r) => r.status === 200 });

  sleep(0.5);

  // Delete
  const deleteRes = http.del(`${BASE_URL}/transactions/${txId}`, null, headers);
  check(deleteRes, { 'delete status 200': (r) => r.status === 200 });

  sleep(1);
}
