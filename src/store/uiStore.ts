import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiState {
  sidebarOpen: boolean;
  theme: Theme;
  matrixRainEnabled: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleMatrixRain: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen:
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 769px)').matches
      : true,
  theme: (localStorage.getItem('theme') as Theme) ?? 'dark',
  matrixRainEnabled: localStorage.getItem('matrixRainEnabled') !== 'false',

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },

  toggleMatrixRain: () => {
    set((state) => {
      const matrixRainEnabled = !state.matrixRainEnabled;
      localStorage.setItem('matrixRainEnabled', String(matrixRainEnabled));
      return { matrixRainEnabled };
    });
  },
}));
