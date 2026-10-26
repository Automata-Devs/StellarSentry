/**
 * Internationalization (i18n) module
 * Currently English only, but structured for multi-language support
 */
import en from './en.js';

const translations = {
  en,
};

let currentLocale = 'en';

/**
 * Set the current locale
 * @param {string} locale - Locale code (e.g., 'en')
 */
export function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

/**
 * Get the current locale
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Get available locales
 * @returns {string[]}
 */
export function getLocales() {
  return Object.keys(translations);
}

/**
 * Translation function
 * @param {string} key - Dot-notation key (e.g., 'commands.ping.response')
 * @param {Object} params - Parameters to interpolate
 * @returns {string}
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let result = translations[currentLocale];

  for (const k of keys) {
    if (result === undefined || result === null) break;
    result = result[k];
  }

  if (result === undefined || result === null) {
    // Fallback to English
    let fallback = translations.en;
    for (const k of keys) {
      if (fallback === undefined || fallback === null) break;
      fallback = fallback[k];
    }
    result = fallback;
  }

  if (result === undefined || result === null) {
    return key; // Return key if not found
  }

  // Interpolate parameters
  if (typeof result === 'string' && Object.keys(params).length > 0) {
    return result.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  return result;
}

/**
 * Get all translations for a namespace
 * @param {string} namespace - Namespace (e.g., 'commands', 'dashboard')
 * @param {string} locale - Locale (optional, uses current)
 * @returns {Object}
 */
export function getNamespace(namespace, locale = currentLocale) {
  const lang = translations[locale] || translations.en;
  return lang[namespace] || {};
}

export default { t, setLocale, getLocale, getLocales, getNamespace };