'use strict';

const env = require('./env');

const supportedLocales = ['es', 'en', 'fr', 'pt'];

const defaultLocale = 'es';

function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return defaultLocale;
  }

  const normalized = locale.toLowerCase().slice(0, 2);
  if (supportedLocales.includes(normalized)) {
    return normalized;
  }

  return defaultLocale;
}

function getClientLocale(req) {
  if (!req || typeof req !== 'object') {
    return defaultLocale;
  }

  const header = req.headers && req.headers['accept-language'];
  if (header && typeof header === 'string') {
    const primary = header.split(',')[0].split(';')[0].trim().toLowerCase();
    const locale = normalizeLocale(primary);
    if (locale !== defaultLocale) {
      return locale;
    }
  }

  const query = req.query && req.query.locale;
  if (query && typeof query === 'string') {
    const locale = normalizeLocale(query);
    return locale;
  }

  return defaultLocale;
}

function t(key, variables = {}) {
  const translations = loadTranslations();
  const locale = normalizeLocale(variables.locale || variables.lang);
  const dictionary = translations[locale] || translations[defaultLocale] || translations.es || {};

  let text = dictionary[key] || dictionary[key.toLowerCase()] || key;

  Object.keys(variables).forEach((variableKey) => {
    if (variableKey === 'locale' || variableKey === 'lang') {
      return;
    }
    const placeholder = `{${variableKey}}`;
    text = text.replace(new RegExp(placeholder, 'g'), variables[variableKey]);
  });

  return text;
}

function loadTranslations() {
  try {
    return require('../i18n/translations.json');
  } catch (error) {
    return {
      es: {},
      en: {},
      fr: {},
      pt: {},
    };
  }
}

function getTranslations() {
  return loadTranslations();
}

function getSupportedLocales() {
  return supportedLocales.slice();
}

function getDefaultLocale() {
  return defaultLocale;
}

module.exports = {
  normalizeLocale,
  getClientLocale,
  t,
  getTranslations,
  getSupportedLocales,
  getDefaultLocale,
  supportedLocales,
  defaultLocale,
};
