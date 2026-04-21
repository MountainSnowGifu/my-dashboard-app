import { apiClient } from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type { LoginCredentials, User, AuthToken } from '@/types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post<ApiResponse<{ user: User; token: AuthToken }>>(
      '/auth/login',
      credentials,
    );
    return data.data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
  },

  me: async () => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },
};
