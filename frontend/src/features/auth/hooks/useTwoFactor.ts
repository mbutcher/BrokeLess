import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';

/**
 * Handles the second step of login when 2FA is required.
 * Reads twoFactorState.twoFactorToken from the store.
 */
export function useTwoFactor() {
  const { twoFactorState, setAuth, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const twoFactorToken = twoFactorState?.twoFactorToken ?? '';

  function handleSuccess(accessToken: string, user: Parameters<typeof setAuth>[0]) {
    setAuth(user, accessToken);
    queryClient.setQueryData(['auth', 'me'], user);
    navigate('/dashboard', { replace: true });
  }

  // TOTP code verification
  const totpMutation = useMutation({
    mutationFn: (token: string) => authApi.totpVerify({ token }, twoFactorToken),
    onSuccess: (response) => {
      const { accessToken, user } = response.data.data;
      handleSuccess(accessToken, user);
    },
  });

  // Backup code verification
  const backupMutation = useMutation({
    mutationFn: (code: string) => authApi.totpBackupVerify({ code }, twoFactorToken),
    onSuccess: (response) => {
      const { accessToken, user } = response.data.data;
      handleSuccess(accessToken, user);
    },
  });

  // WebAuthn assertion (uses twoFactorToken as challengeToken)
  const webAuthnMutation = useMutation({
    mutationFn: async () => {
      const optionsResponse = await authApi.webAuthnAuthenticateOptions();
      const { challengeToken, ...options } = optionsResponse.data.data;
      const authResponse = await startAuthentication({ optionsJSON: options as never });
      const verifyResponse = await authApi.webAuthnAuthenticateVerify(authResponse, challengeToken);
      return verifyResponse.data.data;
    },
    onSuccess: ({ accessToken, user }) => {
      handleSuccess(accessToken, user);
    },
  });

  function cancel() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return {
    methods: twoFactorState?.methods ?? [],
    verifyTotp: (token: string) => totpMutation.mutate(token),
    verifyBackupCode: (code: string) => backupMutation.mutate(code),
    verifyWebAuthn: () => webAuthnMutation.mutate(),
    isVerifyingTotp: totpMutation.isPending,
    isVerifyingBackup: backupMutation.isPending,
    isVerifyingWebAuthn: webAuthnMutation.isPending,
    totpError: totpMutation.error,
    backupError: backupMutation.error,
    webAuthnError: webAuthnMutation.error,
    cancel,
  };
}
