/**
 * k6 load test: Reports & analytics endpoints
 *
 * Tests: monthly summary, forecast, net worth history, spending by category
 * Run: k6 run load-tests/scenarios/reports.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const summaryDuration  = new Trend('monthly_summary_ms', true);
const forecastDuration = new Trend('forecast_ms', true);
const netWorthDuration = new Trend('net_worth_ms', true);

export const options = {
  scenarios: {
    reports_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 5 },
        { duration: '1m',  target: 5 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed:    ['rate<0.01'],
    monthly_summary_ms: ['p(95)<3000'],  // report queries can be slower
    forecast_ms:        ['p(95)<3000'],
    net_worth_ms:       ['p(95)<2000'],
    http_req_duration:  ['p(95)<3000'],
  },
};

const BASE_URL      = __ENV.BASE_URL      || 'http://localhost:3001/api/v1';
const TEST_EMAIL    = __ENV.TEST_EMAIL    || 'alpha@test.local';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'test123';

function login() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) return null;
  return JSON.parse(res.body).data?.accessToken ?? null;
}

export default function () {
  const token = login();
  if (!token) { sleep(2); return; }

  const headers = {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };

  // Monthly summary (last 6 months)
  const summaryStart = Date.now();
  const summaryRes = http.get(`${BASE_URL}/reports/monthly-summary?months=6`, headers);
  summaryDuration.add(Date.now() - summaryStart);
  check(summaryRes, { 'monthly summary 200': (r) => r.status === 200 });

  sleep(0.5);

  // Forecast (next 3 months)
  const forecastStart = Date.now();
  const forecastRes = http.get(`${BASE_URL}/reports/forecast?months=3`, headers);
  forecastDuration.add(Date.now() - forecastStart);
  check(forecastRes, { 'forecast 200': (r) => r.status === 200 });

  sleep(0.5);

  // Net worth history (last 12 months)
  const nwStart = Date.now();
  const nwRes = http.get(`${BASE_URL}/reports/net-worth/history?months=12`, headers);
  netWorthDuration.add(Date.now() - nwStart);
  check(nwRes, { 'net worth history 200': (r) => r.status === 200 });

  sleep(0.5);

  // Spending by category (current month)
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];
  const catRes = http.get(
    `${BASE_URL}/reports/spending-by-category?start=${startOfMonth}&end=${today}`,
    headers,
  );
  check(catRes, { 'spending by category 200': (r) => r.status === 200 });

  sleep(2);
}
