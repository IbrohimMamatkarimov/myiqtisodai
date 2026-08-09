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
  gender?: string | null;
  occupation?: string | null;
  monthly_income?: number | null;
  monthly_expenses?: number | null;
  financial_goal?: string | null;
  onboarding_completed?: boolean;
  is_superuser?: boolean;
  deletion_requested?: boolean;
  deletion_reason?: string | null;
  deletion_requested_at?: string | null;
}

interface AuthState {
  accessToken: string |null;
  refreshToken: string | null;

  user: AuthUser | null;

  // Zustand's persist middleware reads localStorage asynchronously, after
  // the first render - without tracking this, any page checking
  // accessToken on mount (see useRequireAuth) sees a false "not logged in"
  // for a moment on every hard refresh and bounces to /login incorrectly.
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

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

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
