import { RegisterForm } from '../components/RegisterForm';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Budget App</h1>
          <p className="mt-1 text-sm text-muted-foreground">Secure personal finance management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
