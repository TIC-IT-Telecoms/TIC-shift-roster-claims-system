import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,   
      isAuth: false,

      setAuth: (user) => set({ user, isAuth: true }),
      clearAuth: () => set({ user: null, isAuth: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth }),
    }
  )
);