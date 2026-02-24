import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import { deriveKeyFromPRF, setIndexedDbKey } from '@lib/db/crypto';
import { useNavigate } from 'react-router-dom';

/** Label used as HKDF info when deriving the IndexedDB encryption key from PRF output. */
const PRF_EVAL_LABEL = new TextEncoder().encode('budgetapp-indexeddb-v1');

export function useWebAuthnRegister() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [deviceName, setDeviceName] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Get registration options from server
      const optionsResponse = await authApi.webAuthnRegisterOptions();
      const options = optionsResponse.data.data;

      // 2. Prompt browser to create credential
      const registrationResponse = await startRegistration(options as unknown as PublicKeyCredentialCreationOptionsJSON);

      // 3. Verify with server
      const verifyResponse = await authApi.webAuthnRegisterVerify(
        registrationResponse,
        deviceName.trim() || undefined
      );
      return verifyResponse.data.data.passkey;
    },
    onSuccess: () => {
      if (user) {
        updateUser({ ...user, webauthnEnabled: true });
      }
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  return {
    deviceName,
    setDeviceName,
    register: () => mutation.mutate(),
    isRegistering: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

export function useWebAuthnAuthenticate() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Get authentication options (includes challengeToken)
      const optionsResponse = await authApi.webAuthnAuthenticateOptions();
      const { challengeToken, ...options } = optionsResponse.data.data;

      // 2. Merge PRF extension into options so the authenticator returns a
      //    deterministic secret we can use to derive an IndexedDB encryption key.
      const existingExtensions = (
        ((options as Record<string, unknown>)['extensions'] ?? {}) as Record<string, unknown>
      );
      const optionsWithPRF = {
        ...options,
        extensions: {
          ...existingExtensions,
          prf: { eval: { first: Array.from(PRF_EVAL_LABEL) } },
        },
      } as unknown as PublicKeyCredentialRequestOptionsJSON;

      // 3. Prompt browser for assertion (includes PRF if authenticator supports it)
      const authResponse = await startAuthentication(optionsWithPRF);

      // 4. Derive IndexedDB key from PRF output if available
      const prfFirst = (authResponse.clientExtensionResults as Record<string, unknown>)?.['prf'];
      const prfOutput = (prfFirst as Record<string, unknown> | undefined)?.['results'];
      const prfBytes = (prfOutput as Record<string, unknown> | undefined)?.['first'];

      // 5. Verify with server
      const verifyResponse = await authApi.webAuthnAuthenticateVerify(authResponse, challengeToken);
      return { ...verifyResponse.data.data, prfBytes };
    },
    onSuccess: async ({ accessToken, user, prfBytes }) => {
      setAuth(user, accessToken);
      queryClient.setQueryData(['auth', 'me'], user);

      // Derive IndexedDB encryption key from PRF output (if authenticator supported PRF)
      if (prfBytes instanceof ArrayBuffer && prfBytes.byteLength > 0) {
        try {
          const key = await deriveKeyFromPRF(prfBytes, user.id);
          setIndexedDbKey(key);
        } catch {
          // PRF key derivation failed — offline writes will not be available
        }
      }

      navigate('/dashboard', { replace: true });
    },
  });

  return {
    authenticate: () => mutation.mutate(),
    isAuthenticating: mutation.isPending,
    error: mutation.error,
  };
}

export function usePasskeys() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deletePasskey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      // Check if this was the last passkey — handled server-side
    },
  });

  return {
    deletePasskey: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
