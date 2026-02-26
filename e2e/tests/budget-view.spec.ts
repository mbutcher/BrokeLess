import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../helpers/auth';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.describe('Budget View endpoints', () => {
  test('GET /budget-view returns a valid structure', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/budget-view?start=2026-02-01&end=2026-02-28', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    const view = body.data.view;
    expect(typeof view.start).toBe('string');
    expect(typeof view.end).toBe('string');
    expect(Array.isArray(view.lines)).toBe(true);
    expect(typeof view.totalProratedIncome).toBe('number');
    expect(typeof view.totalProratedExpenses).toBe('number');
    expect(typeof view.totalActualIncome).toBe('number');
    expect(typeof view.totalActualExpenses).toBe('number');
  });

  test('GET /budget-view with no budget lines returns empty lines array', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/budget-view?start=2026-02-01&end=2026-02-28', {
      headers: authHeaders(token),
    });
    const { view } = (await res.json()).data;
    expect(view.lines).toHaveLength(0);
    expect(view.totalProratedIncome).toBe(0);
    expect(view.totalProratedExpenses).toBe(0);
  });

  test('GET /budget-view/pay-period returns null or pay period object for a fresh user', async ({
    request,
  }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/budget-view/pay-period', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    // Fresh user has no pay period anchor — null is expected
    expect(body.data.payPeriod === null || typeof body.data.payPeriod === 'object').toBe(true);
  });

  test('GET /budget-view/upcoming returns valid structure', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/budget-view/upcoming?start=2026-02-01&end=2026-02-28', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(typeof body.data.start).toBe('string');
    expect(Array.isArray(body.data.fixedItems)).toBe(true);
    expect(Array.isArray(body.data.flexibleItems)).toBe(true);
  });

  test('GET /budget-view requires authentication', async ({ request }) => {
    const res = await request.get('/budget-view?start=2026-02-01&end=2026-02-28');
    expect(res.status()).toBe(401);
  });
});
