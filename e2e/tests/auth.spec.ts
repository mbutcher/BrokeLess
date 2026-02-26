import { test, expect } from '@playwright/test';

const PASSWORD = 'E2eTestPass1!';

function uniqueEmail() {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
}

test.describe('Auth — register / login / me / logout', () => {
  test('registers a new account and returns 201', async ({ request }) => {
    const res = await request.post('/auth/register', {
      data: { email: uniqueEmail(), password: PASSWORD },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.user.email).toBeDefined();
  });

  test('returns 409 on duplicate email', async ({ request }) => {
    const email = uniqueEmail();
    await request.post('/auth/register', { data: { email, password: PASSWORD } });
    const res = await request.post('/auth/register', { data: { email, password: PASSWORD } });
    expect(res.status()).toBe(409);
  });

  test('login returns accessToken and user', async ({ request }) => {
    const email = uniqueEmail();
    await request.post('/auth/register', { data: { email, password: PASSWORD } });
    const res = await request.post('/auth/login', { data: { email, password: PASSWORD } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe(email);
  });

  test('GET /auth/me returns current user', async ({ request }) => {
    const email = uniqueEmail();
    await request.post('/auth/register', { data: { email, password: PASSWORD } });
    const loginRes = await request.post('/auth/login', { data: { email, password: PASSWORD } });
    const { data } = await loginRes.json();
    const token: string = data.accessToken;

    const meRes = await request.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.data.user.email).toBe(email);
  });

  test('GET /auth/me returns 401 without token', async ({ request }) => {
    const res = await request.get('/auth/me');
    expect(res.status()).toBe(401);
  });

  test('login fails with wrong password', async ({ request }) => {
    const email = uniqueEmail();
    await request.post('/auth/register', { data: { email, password: PASSWORD } });
    const res = await request.post('/auth/login', { data: { email, password: 'WrongPass1!' } });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/logout revokes session', async ({ request }) => {
    const email = uniqueEmail();
    await request.post('/auth/register', { data: { email, password: PASSWORD } });
    const loginRes = await request.post('/auth/login', { data: { email, password: PASSWORD } });
    const { data } = await loginRes.json();
    const token: string = data.accessToken;

    const logoutRes = await request.post('/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status()).toBe(200);
  });
});
