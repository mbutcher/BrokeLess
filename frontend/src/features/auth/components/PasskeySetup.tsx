import { useQuery } from '@tanstack/react-query';
import { Fingerprint, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { authApi } from '../api/authApi';
import { useWebAuthnRegister, usePasskeys } from '../hooks/useWebAuthn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Badge } from '@components/ui/badge';
import type { Passkey } from '../types';
import { getApiErrorMessage } from '@lib/api/errors';


function PasskeyRow({ passkey, onDelete }: { passkey: Passkey; onDelete: () => void }) {
  const lastUsed = passkey.lastUsedAt
    ? formatDistanceToNow(new Date(passkey.lastUsedAt), { addSuffix: true })
    : 'Never used';

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Fingerprint className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{passkey.deviceName ?? 'Unnamed device'}</p>
          <p className="text-xs text-muted-foreground">{lastUsed}</p>
        </div>
      </div>
      {passkey.transports && passkey.transports.length > 0 && (
        <div className="hidden gap-1 sm:flex">
          {passkey.transports.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        title="Remove passkey"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remove passkey</span>
      </Button>
    </div>
  );
}

export function PasskeySetup() {
  const { data: passkeysData, isLoading } = useQuery({
    queryKey: ['passkeys'],
    queryFn: async () => {
      const response = await authApi.listPasskeys();
      return response.data.data.passkeys;
    },
  });

  const { deviceName, setDeviceName, register, isRegistering, error, isSuccess, reset } =
    useWebAuthnRegister();
  const { deletePasskey, isDeleting, deleteError } = usePasskeys();

  const passkeys = passkeysData ?? [];

  return (
    <div className="space-y-6">
      {/* Registered passkeys list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Your passkeys</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <PasskeyRow
                key={pk.id}
                passkey={pk}
                onDelete={() => deletePasskey(pk.id)}
              />
            ))}
          </div>
        )}

        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(deleteError)}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Register new passkey */}
      <div className="space-y-3 rounded-md border p-4">
        <h4 className="text-sm font-medium">Add a passkey</h4>

        {isSuccess ? (
          <div className="space-y-2">
            <Alert>
              <AlertDescription>Passkey registered successfully!</AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={reset}>
              Add another
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Device name (optional)"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                className="gap-2"
                isLoading={isRegistering}
                onClick={register}
              >
                <Plus className="h-4 w-4" />
                Register
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your browser will prompt you to use your fingerprint, face ID, or security key.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
