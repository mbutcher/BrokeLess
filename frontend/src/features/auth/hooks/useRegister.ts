import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { RegisterFormData } from '../schemas';

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: Omit<RegisterFormData, 'confirmPassword'>) => authApi.register(data),
    onSuccess: () => {
      // Registration successful — redirect to login
      navigate('/login?registered=true', { replace: true });
    },
  });
}
