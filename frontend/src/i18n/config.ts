export const locales = ['uz', 'en', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'uz';

export const localeLabels: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};
