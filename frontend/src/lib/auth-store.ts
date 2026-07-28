import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;

  is_email_verified: boolean;

  language: string;
  theme: string;
  currency: string;

  // NEW
  age?: number | null;
  occupation?: string | null;
  monthly_income?: number | null;
  monthly_expenses?: number | null;
  financial_goal?: string | null;
  onboarding_completed?: boolean;
}

interface AuthState {
  accessToken: string |null;
  refreshToken: string | null;

  user: AuthUser | null;

  setTokens: (accessToken: string, refreshToken: string) => void;

  setUser: (user: AuthUser) => void;

  updateUser: (data: Partial<AuthUser>) => void;

  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,

      user: null,

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      setUser: (user) =>
        set({
          user,
        }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...data,
              }
            : null,
        })),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    {
      name: 'myiqtisod-auth',
    }
  )
);
