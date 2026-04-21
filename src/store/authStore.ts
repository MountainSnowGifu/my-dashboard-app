import { create } from 'zustand';
import type { User } from '@/types/auth';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getStoredUser(),
  token: authService.getStoredToken(),
  isAuthenticated: authService.getStoredToken() !== null,

  login: (user, token) => {
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({ user });
  },
}));
