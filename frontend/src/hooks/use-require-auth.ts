'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/navigation';
import { useAuthStore } from '@/lib/auth-store';

export function useRequireAuth() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    } else {
      setChecked(true);
    }
  }, [accessToken, router]);

  return checked;
}
