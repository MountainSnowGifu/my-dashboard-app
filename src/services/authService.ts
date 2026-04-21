import { apiClient } from '@/services/apiClient';
import { storageService } from '@/services/storageService';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/utils/constants';
import type { LoginCredentials, AuthToken, User } from '@/types/auth';
import type { ApiResponse } from '@/types/api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: AuthToken }> {
    const { data } = await apiClient.post<ApiResponse<{ user: User; token: AuthToken }>>(
      '/auth/login',
      credentials,
    );
    const { user, token } = data.data;
    storageService.set(TOKEN_KEY, token.accessToken);
    storageService.set(REFRESH_TOKEN_KEY, token.refreshToken);
    storageService.set(USER_KEY, user);
    return { user, token };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      storageService.remove(TOKEN_KEY);
      storageService.remove(REFRESH_TOKEN_KEY);
      storageService.remove(USER_KEY);
    }
  },

  async refreshToken(): Promise<AuthToken> {
    const refreshToken = storageService.get<string>(REFRESH_TOKEN_KEY);
    const { data } = await apiClient.post<ApiResponse<AuthToken>>('/auth/refresh', {
      refreshToken,
    });
    const token = data.data;
    storageService.set(TOKEN_KEY, token.accessToken);
    storageService.set(REFRESH_TOKEN_KEY, token.refreshToken);
    return token;
  },

  getStoredUser(): User | null {
    return storageService.get<User>(USER_KEY);
  },

  getStoredToken(): string | null {
    return storageService.get<string>(TOKEN_KEY);
  },
};
