import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../helpers/auth';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const BASE_ACCOUNT = {
  name: 'E2E Checking',
  type: 'checking',
  isAsset: true,
  startingBalance: 1000,
  currency: 'USD',
};

test.describe('Accounts CRUD', () => {
  test('creates an account and returns 201', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.post('/accounts', {
      headers: authHeaders(token),
      data: BASE_ACCOUNT,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.account.name).toBe('E2E Checking');
    expect(body.data.account.currentBalance).toBe(1000);
  });

  test('lists accounts (initially empty)', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/accounts', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.accounts)).toBe(true);
  });

  test('gets account by id', async ({ request }) => {
    const token = await registerAndLogin(request);
    const createRes = await request.post('/accounts', {
      headers: authHeaders(token),
      data: BASE_ACCOUNT,
    });
    const { account } = (await createRes.json()).data;

    const getRes = await request.get(`/accounts/${account.id}`, { headers: authHeaders(token) });
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.account.id).toBe(account.id);
  });

  test('updates an account', async ({ request }) => {
    const token = await registerAndLogin(request);
    const createRes = await request.post('/accounts', {
      headers: authHeaders(token),
      data: BASE_ACCOUNT,
    });
    const { account } = (await createRes.json()).data;

    const patchRes = await request.patch(`/accounts/${account.id}`, {
      headers: authHeaders(token),
      data: { name: 'Updated Checking', color: '#FF0000' },
    });
    expect(patchRes.status()).toBe(200);
    const updated = (await patchRes.json()).data.account;
    expect(updated.name).toBe('Updated Checking');
    expect(updated.color).toBe('#FF0000');
  });

  test('deletes an account', async ({ request }) => {
    const token = await registerAndLogin(request);
    const createRes = await request.post('/accounts', {
      headers: authHeaders(token),
      data: BASE_ACCOUNT,
    });
    const { account } = (await createRes.json()).data;

    const deleteRes = await request.delete(`/accounts/${account.id}`, {
      headers: authHeaders(token),
    });
    expect(deleteRes.status()).toBe(200);

    const getRes = await request.get(`/accounts/${account.id}`, { headers: authHeaders(token) });
    expect(getRes.status()).toBe(404);
  });

  test('returns 404 for unknown account id', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/accounts/00000000-0000-0000-0000-000000000000', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });

  test('user isolation — cannot access another user\'s account', async ({ request }) => {
    const tokenA = await registerAndLogin(request);
    const tokenB = await registerAndLogin(request);

    const createRes = await request.post('/accounts', {
      headers: authHeaders(tokenA),
      data: BASE_ACCOUNT,
    });
    const { account } = (await createRes.json()).data;

    const isolationRes = await request.get(`/accounts/${account.id}`, {
      headers: authHeaders(tokenB),
    });
    expect(isolationRes.status()).toBe(404);
  });
});
