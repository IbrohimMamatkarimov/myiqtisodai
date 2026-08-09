'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { api } from '@/lib/api-client';
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
  const buttonRef = useRef<HTMLDivElement>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  async function handleCredentialResponse(response: { credential: string }) {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      setTokens(data.access_token, data.refresh_token);

      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setUser(me.data);

      router.push(
        me.data.is_superuser ? '/admin' : me.data.onboarding_completed ? '/dashboard' : '/onboarding'
      );
    } catch {
      // Silent on purpose - the Google button has no error UI slot of its
      // own. A failure here is rare (expired token, network blip); the
      // person just clicks the button again.
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
    </>
  );
}
