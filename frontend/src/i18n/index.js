// FILE: frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ---------------------------------------------------------------------------
// Todas las traducciones del sistema, organizadas en un archivo por módulo
// (uno por idioma) dentro de ./en y ./es. Cada archivo exporta un único
// objeto de nivel superior con el nombre del módulo, por ejemplo:
//   { "students": { "title": "Estudiantes", ... } }
//
// IMPORTANTE: en toda la aplicación los componentes llaman a t('modulo.clave')
// sin especificar un namespace (useTranslation() sin argumentos), por lo que
// TODOS los módulos deben vivir combinados dentro del namespace por defecto.
// Antes cada archivo se cargaba como un namespace de i18next separado, lo
// que hacía que ninguna traducción fuera de 'common' se resolviera nunca
// (la app mostraba las claves crudas, p. ej. "students.title", en vez del
// texto traducido). Con import.meta.glob cargamos y fusionamos todos los
// módulos automáticamente, así que agregar un nuevo archivo de traducción
// en el futuro no requiere tocar este archivo.
// ---------------------------------------------------------------------------

const enModules = import.meta.glob('./en/*.json', { eager: true });
const esModules = import.meta.glob('./es/*.json', { eager: true });

const mergeModules = (modules) => {
  const merged = {};
  for (const path in modules) {
    const mod = modules[path].default || modules[path];
    Object.assign(merged, mod);
  }
  return merged;
};

const resources = {
  en: { translation: mergeModules(enModules) },
  es: { translation: mergeModules(esModules) },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    ns: ['translation'],
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
