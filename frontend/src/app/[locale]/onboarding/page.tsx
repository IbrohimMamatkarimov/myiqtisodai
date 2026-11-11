'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ArrowRight, Loader2 } from 'lucide-react';

const COPY = {
  uz: { intro: 'Boshlash uchun faqat ismingiz kifoya.', name: 'Ismingiz', greeting: 'Xush kelibsiz,', ready: 'Hammasi tayyor', subtitle: 'Pul rejalaringiz uchun yangi, xotirjam boshlanish.', enter: 'Boshqaruv paneliga o‘tish', opening: 'Boshqaruv paneliga o‘tyapmiz…' },
  en: { intro: 'Just your name, and you’re ready to begin.', name: 'Your name', greeting: 'Welcome,', ready: 'You’re all set', subtitle: 'A fresh, calmer start for your money plans.', enter: 'Open my dashboard', opening: 'Taking you to your dashboard…' },
  ru: { intro: 'Для начала нужно только ваше имя.', name: 'Ваше имя', greeting: 'Добро пожаловать,', ready: 'Всё готово', subtitle: 'Спокойное начало для ваших финансовых планов.', enter: 'Перейти в панель', opening: 'Переходим в вашу панель…' },
};

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.uz;
  const router = useRouter();
  const welcomeHeading = useRef<HTMLHeadingElement>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!showWelcome) return;
    welcomeHeading.current?.focus();
    router.prefetch('/dashboard');
    const timer = window.setTimeout(() => router.replace('/dashboard'), 2600);
    return () => window.clearTimeout(timer);
  }, [showWelcome, router]);

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || showWelcome) return;
    const name = fullName.trim();
    if (name.length < 2) {
      setError(t('nameRequiredError'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/users/complete-onboarding', { full_name: name });
      useAuthStore.getState().setUser(data);
      setFullName(name);
      setShowWelcome(true);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="iq-onboarding">
      <header className="iq-onboarding-header">
        <Link href="/" className="iq-onboarding-brand">Iqtisod<span>AI</span></Link>
        <LanguageSwitcher />
      </header>
      <div className="iq-onboarding-glow" aria-hidden="true" />
      {showWelcome ? (
        <section className="iq-welcome" aria-labelledby="welcome-name">
          <div className="iq-welcome-seal" aria-hidden="true">
            <span className="iq-welcome-ring" />
            <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="34" /><path d="m25 41 10 10 21-23" /></svg>
            <i className="iq-welcome-dot one" /><i className="iq-welcome-dot two" /><i className="iq-welcome-dot three" />
          </div>
          <p className="iq-welcome-eyebrow">{copy.ready}</p>
          <h1 ref={welcomeHeading} id="welcome-name" tabIndex={-1}>
            <span>{copy.greeting}</span>
            <strong>{fullName.split(/\s+/)[0]}.</strong>
          </h1>
          <p className="iq-welcome-description">{copy.subtitle}</p>
          <Link href="/dashboard" className="iq-onboarding-action">{copy.enter}<ArrowRight size={18} aria-hidden="true" /></Link>
          <p className="iq-welcome-opening" role="status">{copy.opening}</p>
        </section>
      ) : (
        <form onSubmit={finish} className="iq-onboarding-card" aria-busy={loading}>
          <span className="iq-onboarding-kicker">IqtisodAI</span>
          <h1>{t('screen1Title')}</h1>
          <p className="iq-onboarding-intro">{copy.intro}</p>
          <label htmlFor="onboarding-name">{copy.name}</label>
          <input id="onboarding-name" name="name" autoComplete="name" required autoFocus minLength={2} maxLength={255}
            placeholder={t('namePlaceholder')} value={fullName} disabled={loading}
            onChange={event => { setFullName(event.target.value); if (error) setError(null); }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'onboarding-error' : undefined} />
          {error && <p id="onboarding-error" role="alert" className="iq-onboarding-error">{error}</p>}
          <button type="submit" disabled={loading} className="iq-onboarding-action">
            {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            {loading ? t('saving') : t('finish')}
            {!loading && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </form>
      )}
      <style>{`
.iq-onboarding{min-height:100dvh;position:relative;isolation:isolate;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:110px 24px 56px;background:#f5f8f4;color:#183c2d}
.iq-onboarding-header{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:26px 36px;z-index:2}
.iq-onboarding-brand{font-size:23px;font-weight:800;letter-spacing:-1px;text-decoration:none;color:#183c2d}
.iq-onboarding-brand span{color:#229761}
.iq-onboarding-glow{position:absolute;z-index:-1;width:700px;height:700px;max-width:150vw;border-radius:50%;background:radial-gradient(circle,#dcebdc 0%,#ecf3e9 45%,transparent 70%);pointer-events:none}
.iq-onboarding-card{width:min(100%,440px);padding:38px;border:1px solid #dde6dc;border-radius:26px;background:#ffffffed;box-shadow:0 22px 70px #163c2c0a;animation:iq-onboard-enter .45s ease-out both}
.iq-onboarding-kicker,.iq-welcome-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#65806a}
.iq-onboarding-card h1{font-size:clamp(28px,5vw,36px);line-height:1.2;letter-spacing:-.04em;margin:13px 0 12px;font-weight:700}
.iq-onboarding-intro{font-size:15px;line-height:1.7;color:#6b7b70;margin:0 0 30px}
.iq-onboarding-card label{display:block;font-size:13px;font-weight:600;margin-bottom:9px}
.iq-onboarding-card input{width:100%;min-height:52px;padding:13px 16px;border:1px solid #cedbd0;border-radius:12px;background:#fbfcfa;color:#183c2d;font:inherit;transition:border-color .15s,box-shadow .15s}
.iq-onboarding-card input:focus{outline:none;border-color:#3f8a63;box-shadow:0 0 0 3px #3f8a631a}
.iq-onboarding-card input::placeholder{color:#94a298}
.iq-onboarding-action{display:flex;align-items:center;justify-content:center;gap:12px;min-height:51px;border:0;border-radius:12px;padding:13px 20px;background:#21583c;color:#fff;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:background-color .15s,transform .15s}
.iq-onboarding-card .iq-onboarding-action{width:100%;margin-top:24px}
.iq-onboarding-action:hover{background:#17432d}
.iq-onboarding-action:active{transform:translateY(1px)}
.iq-onboarding-action:focus-visible,.iq-onboarding-brand:focus-visible{outline:3px solid #91bd9e;outline-offset:4px}
.iq-onboarding-action:disabled{opacity:.65;cursor:wait}
.iq-onboarding-error{font-size:13px;line-height:1.6;color:#b33333;margin-top:12px}
.iq-welcome{text-align:center;width:min(100%,520px);animation:iq-onboard-enter .5s ease-out both}
.iq-welcome-seal{position:relative;width:132px;height:132px;margin:0 auto 28px;display:grid;place-items:center}
.iq-welcome-seal svg{width:86px;height:86px;position:relative;overflow:visible}
.iq-welcome-seal circle{stroke:#c8dcc8;stroke-width:1.4;fill:#f9fcf7}
.iq-welcome-seal path{stroke:#286346;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:52;stroke-dashoffset:52;animation:iq-check-draw .6s .25s ease-out forwards}
.iq-welcome-ring{position:absolute;inset:0;border:1px solid #bdcfb2;border-radius:50%;animation:iq-ring-open .9s ease-out both}
.iq-welcome-dot{position:absolute;width:7px;height:7px;border-radius:50%;background:#c3a969;animation:iq-dot-arrive .7s .2s ease-out both}
.iq-welcome-dot.one{left:5px;top:35px}.iq-welcome-dot.two{right:13px;bottom:16px;width:5px;height:5px}.iq-welcome-dot.three{right:18px;top:7px;width:4px;height:4px;background:#699c79}
.iq-welcome-eyebrow{margin:0 0 15px}
.iq-welcome h1{margin:0;outline:none;line-height:1.12;letter-spacing:-.045em}
.iq-welcome h1 span{display:block;font-size:clamp(24px,5vw,34px);font-weight:400;color:#6b7d6d;animation:iq-onboard-enter .5s .12s both}
.iq-welcome h1 strong{display:block;font-size:clamp(40px,9vw,64px);font-weight:650;margin-top:7px;overflow-wrap:anywhere;animation:iq-onboard-enter .5s .22s both}
.iq-welcome-description{max-width:330px;margin:20px auto 28px;color:#6b7b70;font-size:15px;line-height:1.75;animation:iq-onboard-enter .5s .3s both}
.iq-welcome>.iq-onboarding-action{width:fit-content;max-width:100%;margin:auto;animation:iq-onboard-enter .5s .35s both}
.iq-welcome-opening{font-size:12px;color:#7d8c7f;margin:17px 0 0}
@keyframes iq-onboard-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes iq-check-draw{to{stroke-dashoffset:0}}
@keyframes iq-ring-open{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}
@keyframes iq-dot-arrive{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
@media(max-width:540px){.iq-onboarding{padding:100px 20px 36px}.iq-onboarding-header{padding:22px}.iq-onboarding-card{padding:28px 24px;border-radius:22px}}
@media(prefers-reduced-motion:reduce){.iq-onboarding *{animation:none!important;transition:none!important}.iq-welcome-seal path{stroke-dashoffset:0}}
`}</style>
    </main>
  );
}
