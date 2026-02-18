import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';

type TotpSetupStep = 'idle' | 'display' | 'verify' | 'backup-codes';

interface TotpSetupState {
  step: TotpSetupStep;
  qrCodeDataUrl: string;
  otpauthUrl: string;
  pendingSecret: string;
  backupCodes: string[];
}

export function useTotpSetup() {
  const queryClient = useQueryClient();
  const { updateUser, user } = useAuthStore();

  const [state, setState] = useState<TotpSetupState>({
    step: 'idle',
    qrCodeDataUrl: '',
    otpauthUrl: '',
    pendingSecret: '',
    backupCodes: [],
  });

  // Step 1: Generate TOTP secret + QR code
  const setupMutation = useMutation({
    mutationFn: () => authApi.totpSetup(),
    onSuccess: (response) => {
      const { secret, qrCodeDataUrl, otpauthUrl } = response.data.data;
      setState((prev) => ({
        ...prev,
        step: 'display',
        qrCodeDataUrl,
        otpauthUrl,
        pendingSecret: secret,
      }));
    },
  });

  // Step 2: Confirm with a valid TOTP token — activates TOTP + returns backup codes
  const confirmMutation = useMutation({
    mutationFn: (token: string) =>
      authApi.totpConfirm({ token, pendingSecret: state.pendingSecret }),
    onSuccess: (response) => {
      const { backupCodes } = response.data.data;
      setState((prev) => ({ ...prev, step: 'backup-codes', backupCodes }));
      if (user) {
        updateUser({ ...user, totpEnabled: true });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  // Disable TOTP
  const disableMutation = useMutation({
    mutationFn: () => authApi.totpDisable(),
    onSuccess: () => {
      if (user) {
        updateUser({ ...user, totpEnabled: false });
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  function startSetup() {
    setupMutation.mutate();
  }

  function confirmToken(token: string) {
    confirmMutation.mutate(token);
  }

  function reset() {
    setState({ step: 'idle', qrCodeDataUrl: '', otpauthUrl: '', pendingSecret: '', backupCodes: [] });
  }

  return {
    step: state.step,
    qrCodeDataUrl: state.qrCodeDataUrl,
    otpauthUrl: state.otpauthUrl,
    backupCodes: state.backupCodes,
    isStarting: setupMutation.isPending,
    isConfirming: confirmMutation.isPending,
    isDisabling: disableMutation.isPending,
    setupError: setupMutation.error,
    confirmError: confirmMutation.error,
    disableError: disableMutation.error,
    startSetup,
    confirmToken,
    disable: () => disableMutation.mutate(),
    reset,
  };
}
