import { APIRequestContext } from '@playwright/test';

const PASSWORD = 'E2eTestPass1!';

export async function registerAndLogin(request: APIRequestContext): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;

  await request.post('/auth/register', {
    data: { email, password: PASSWORD },
  });

  const res = await request.post('/auth/login', {
    data: { email, password: PASSWORD },
  });

  const body = await res.json();
  return body.data.accessToken as string;
}
