/**
 * k6 load test: Authentication flows
 *
 * Tests: password login, token refresh, logout
 * Run: k6 run load-tests/scenarios/auth.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const loginErrors = new Rate('login_errors');
const loginDuration = new Trend('login_duration_ms', true);
const refreshDuration = new Trend('refresh_duration_ms', true);

export const options = {
  scenarios: {
    login_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // ramp up
        { duration: '1m',  target: 10 },  // sustain
        { duration: '15s', target: 0  },  // ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed:   ['rate<0.01'],         // <1% errors
    login_errors:      ['rate<0.01'],
    login_duration_ms: ['p(95)<2000'],        // 95th percentile < 2s
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL    = __ENV.TEST_EMAIL    || 'alpha@test.local';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'test123';

export default function () {
  // ── Login ────────────────────────────────────────────────────────────────
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginDuration.add(Date.now() - loginStart);

  const loginOk = check(loginRes, {
    'login status 200':        (r) => r.status === 200,
    'login returns accessToken': (r) => {
      try { return Boolean(JSON.parse(r.body).data?.accessToken); } catch { return false; }
    },
  });
  loginErrors.add(!loginOk);

  if (!loginOk) { sleep(1); return; }

  const { accessToken } = JSON.parse(loginRes.body).data;
  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  };

  sleep(0.5);

  // ── GET /auth/me ─────────────────────────────────────────────────────────
  const meRes = http.get(`${BASE_URL}/auth/me`, authHeaders);
  check(meRes, { '/auth/me status 200': (r) => r.status === 200 });

  sleep(0.5);

  // ── Token refresh ─────────────────────────────────────────────────────────
  // The refresh cookie is set by the login response; k6's cookie jar handles it.
  const refreshStart = Date.now();
  const refreshRes = http.post(`${BASE_URL}/auth/refresh`, null, {
    headers: { 'Content-Type': 'application/json' },
  });
  refreshDuration.add(Date.now() - refreshStart);

  check(refreshRes, { 'refresh status 200': (r) => r.status === 200 });

  sleep(0.5);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, authHeaders);
  check(logoutRes, { 'logout status 200': (r) => r.status === 200 });

  sleep(1);
}
