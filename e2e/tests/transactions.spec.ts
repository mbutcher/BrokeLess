import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../helpers/auth';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createAccount(request: Parameters<typeof test>[1]['request'], token: string) {
  const res = await request.post('/accounts', {
    headers: authHeaders(token),
    data: {
      name: 'Test Account',
      type: 'checking',
      isAsset: true,
      startingBalance: 500,
      currency: 'USD',
    },
  });
  return (await res.json()).data.account;
}

test.describe('Transactions CRUD', () => {
  test('creates a transaction and adjusts account balance', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    const res = await request.post('/transactions', {
      headers: authHeaders(token),
      data: {
        accountId: account.id,
        amount: -50,
        date: '2026-02-01',
        payee: 'Coffee Shop',
        description: 'Morning coffee',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.transaction.amount).toBe(-50);
    expect(body.data.transaction.payee).toBe('Coffee Shop');
    expect(Array.isArray(body.data.transferCandidates)).toBe(true);
  });

  test('lists transactions with pagination', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: -10, date: '2026-02-01' },
    });
    await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: -20, date: '2026-02-02' },
    });

    const res = await request.get('/transactions', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  test('gets a transaction by id', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    const createRes = await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: 100, date: '2026-02-01' },
    });
    const { transaction } = (await createRes.json()).data;

    const getRes = await request.get(`/transactions/${transaction.id}`, {
      headers: authHeaders(token),
    });
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).data.transaction.id).toBe(transaction.id);
  });

  test('updates a transaction', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    const createRes = await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: -75, date: '2026-02-01' },
    });
    const { transaction } = (await createRes.json()).data;

    const patchRes = await request.patch(`/transactions/${transaction.id}`, {
      headers: authHeaders(token),
      data: { payee: 'Updated Payee', isCleared: true },
    });
    expect(patchRes.status()).toBe(200);
    const updated = (await patchRes.json()).data.transaction;
    expect(updated.payee).toBe('Updated Payee');
    expect(updated.isCleared).toBe(true);
  });

  test('deletes a transaction', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    const createRes = await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: -30, date: '2026-02-01' },
    });
    const { transaction } = (await createRes.json()).data;

    const deleteRes = await request.delete(`/transactions/${transaction.id}`, {
      headers: authHeaders(token),
    });
    expect(deleteRes.status()).toBe(200);

    const getRes = await request.get(`/transactions/${transaction.id}`, {
      headers: authHeaders(token),
    });
    expect(getRes.status()).toBe(404);
  });

  test('filters transactions by accountId', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: account.id, amount: -15, date: '2026-02-01' },
    });

    const res = await request.get(`/transactions?accountId=${account.id}`, {
      headers: authHeaders(token),
    });
    const body = await res.json();
    const allMatch = body.data.data.every(
      (tx: { accountId: string }) => tx.accountId === account.id
    );
    expect(allMatch).toBe(true);
  });

  test('full-text search returns matching transactions', async ({ request }) => {
    const token = await registerAndLogin(request);
    const account = await createAccount(request, token);

    await request.post('/transactions', {
      headers: authHeaders(token),
      data: {
        accountId: account.id,
        amount: -45,
        date: '2026-02-01',
        payee: 'Whole Foods Market',
        description: 'Groceries',
      },
    });

    const res = await request.get('/transactions?q=whole+foods', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    const found = body.data.data.some((tx: { payee: string }) => tx.payee === 'Whole Foods Market');
    expect(found).toBe(true);
  });

  test('search with no match returns empty result', async ({ request }) => {
    const token = await registerAndLogin(request);
    const res = await request.get('/transactions?q=zzz-no-match-xyz', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(0);
  });

  test('links and unlinks two transactions as a transfer', async ({ request }) => {
    const token = await registerAndLogin(request);
    const accountA = await createAccount(request, token);
    const accountB = await createAccount(request, token);

    const txARes = await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: accountA.id, amount: -200, date: '2026-02-01' },
    });
    const txA = (await txARes.json()).data.transaction;

    const txBRes = await request.post('/transactions', {
      headers: authHeaders(token),
      data: { accountId: accountB.id, amount: 200, date: '2026-02-01' },
    });
    const txB = (await txBRes.json()).data.transaction;

    // Link
    const linkRes = await request.post(`/transactions/${txA.id}/link`, {
      headers: authHeaders(token),
      data: { targetTransactionId: txB.id },
    });
    expect(linkRes.status()).toBe(200);

    // Unlink
    const unlinkRes = await request.delete(`/transactions/${txA.id}/link`, {
      headers: authHeaders(token),
    });
    expect(unlinkRes.status()).toBe(200);
  });
});
