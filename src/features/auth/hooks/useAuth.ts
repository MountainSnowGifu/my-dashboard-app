import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/authApi';
import { useAuthStore } from '@/store';
import { storageService } from '@/services/storageService';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/utils/constants';
import type { LoginCredentials } from '@/types/auth';

export function useLogin() {
  const storeLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: ({ user, token }) => {
      storageService.set(TOKEN_KEY, token.accessToken);
      storageService.set(REFRESH_TOKEN_KEY, token.refreshToken);
      storageService.set(USER_KEY, user);
      storeLogin(user, token.accessToken);
    },
  });
}

export function useLogout() {
  const storeLogout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      storageService.remove(TOKEN_KEY);
      storageService.remove(REFRESH_TOKEN_KEY);
      storageService.remove(USER_KEY);
      storeLogout();
    },
  });
}
