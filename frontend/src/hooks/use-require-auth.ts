'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/navigation';
import { useAuthStore } from '@/lib/auth-store';

export function useRequireAuth() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Don't decide anything until the persisted token has actually been
    // read back from localStorage - otherwise every hard refresh briefly
    // sees accessToken as null and incorrectly bounces to /login.
    if (!hasHydrated) return;
    if (!accessToken) {
      router.push('/login');
    } else {
      setChecked(true);
    }
  }, [hasHydrated, accessToken, router]);

  return checked;
}
