import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

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
      const registrationResponse = await startRegistration({ optionsJSON: options as never });

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

      // 2. Prompt browser for assertion
      const authResponse = await startAuthentication({ optionsJSON: options as never });

      // 3. Verify with server
      const verifyResponse = await authApi.webAuthnAuthenticateVerify(authResponse, challengeToken);
      return verifyResponse.data.data;
    },
    onSuccess: ({ accessToken, user }) => {
      setAuth(user, accessToken);
      queryClient.setQueryData(['auth', 'me'], user);
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
  const { user, updateUser } = useAuthStore();

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
