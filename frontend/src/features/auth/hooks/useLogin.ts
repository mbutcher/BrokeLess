import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import type { LoginFormData } from '../schemas';

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuth, setTwoFactorRequired } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (response) => {
      const data = response.data.data;

      if (data.requiresTwoFactor && data.twoFactorToken && data.methods) {
        // 2FA required — store the interim token and redirect to 2FA UI
        setTwoFactorRequired(data.twoFactorToken, data.methods);
        navigate('/login/two-factor', { replace: true });
        return;
      }

      if (data.accessToken && data.user) {
        setAuth(data.user, data.accessToken);
        queryClient.setQueryData(['auth', 'me'], data.user);
        navigate('/dashboard', { replace: true });
      }
    },
  });
}
