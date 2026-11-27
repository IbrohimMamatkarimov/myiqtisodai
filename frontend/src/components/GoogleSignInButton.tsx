'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useTranslations } from 'next-intl';
import { api, getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from '@/navigation';

declare global {
  interface Window {
    google?: any;
  }
}

/** "Continue with Google" button using Google's own Identity Services script
 * directly (no @react-oauth/google or similar package) - avoids adding a new
 * npm dependency that would need `npm install` before it works. Handles the
 * full sign-in flow itself: verifies with the backend, stores tokens, and
 * redirects exactly like the normal email/password login does. */
export function GoogleSignInButton() {
  const t = useTranslations('common');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  async function handleCredentialResponse(response: { credential: string }) {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      const user = data.user ?? (await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })).data;
      setTokens(data.access_token, data.refresh_token);
      setUser(user);
      router.replace(user.is_superuser ? '/admin' : user.onboarding_completed ? '/dashboard' : '/onboarding');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function renderButton() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    });
  }

  useEffect(() => {
    // Script may already be loaded from a previous page in this session.
    if (window.google?.accounts?.id) renderButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={renderButton} />
      <div className="flex justify-center" ref={buttonRef} />
      {loading && <p role="status" className="text-center text-sm text-textmuted">{t('loading')}</p>}
      {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
    </>
  );
}
