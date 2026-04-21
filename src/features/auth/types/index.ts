import type { User, AuthToken } from '@/types/auth';

export type { User, LoginCredentials, AuthToken } from '@/types/auth';

export interface LoginResponse {
  user: User;
  token: AuthToken;
}
