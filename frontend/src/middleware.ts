import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Localized URLs already contain all routing information. Let Next serve
// those public pages directly from its cache; keep middleware only for bare
// URLs that need locale detection and a redirect.
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*|(?:uz|en|ru)(?:/|$)).*)'],
};
