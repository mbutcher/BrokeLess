import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

export function LoginPage() {
  const [params] = useSearchParams();
  const justRegistered = params.get('registered') === 'true';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Budget App</h1>
          <p className="mt-1 text-sm text-muted-foreground">Secure personal finance management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            {justRegistered && (
              <CardDescription className="text-green-600">
                Account created! Sign in to get started.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
