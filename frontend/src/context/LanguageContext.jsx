// FILE: frontend/src/context/LanguageContext.jsx
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { api } from '../api/axiosClient';
import { useAuth } from '../hooks/useAuth';

export const LanguageContext = createContext(null);

const SUPPORTED = ['en', 'es'];

// El detector de i18next (i18next-browser-languagedetector) cachea el idioma
// elegido en localStorage bajo la clave 'i18nextLng'. Leemos ESA misma clave
// para que el estado del contexto nazca alineado con el idioma con el que ya
// inicializó i18next y no haya un parpadeo con el idioma equivocado.
const detectBrowserLang = () => {
  try {
    const browserLang = navigator.language?.split('-')[0] || 'en';
    return SUPPORTED.includes(browserLang) ? browserLang : 'en';
  } catch (e) {
    return 'en';
  }
};

const initialLanguage = () => {
  try {
    return localStorage.getItem('i18nextLng') || detectBrowserLang();
  } catch (e) {
    return detectBrowserLang();
  }
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [loading, setLoading] = useState(true);

  // Cargar idioma guardado
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = localStorage.getItem('i18nextLng');
        if (savedLang && SUPPORTED.includes(savedLang)) {
          setCurrentLanguage(savedLang);
          if (i18n.language !== savedLang) await i18n.changeLanguage(savedLang);
          setLoading(false);
          return;
        }

        // Si hay usuario autenticado, cargar su preferencia desde el backend
        if (user) {
          try {
            const response = await api.get('/settings');
            const settings = response.data?.data || response.data;
            const backendLang = settings?.default_language;
            if (backendLang && SUPPORTED.includes(backendLang)) {
              setCurrentLanguage(backendLang);
              await i18n.changeLanguage(backendLang);
              localStorage.setItem('i18nextLng', backendLang);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error al cargar idioma del usuario:', e);
          }
        }

        // Fallback: detectar idioma del navegador
        const lang = detectBrowserLang();
        setCurrentLanguage(lang);
        await i18n.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
      } catch (error) {
        console.error('Error al cargar idioma:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLanguage();
  }, [user, i18n]);

  // Cambiar idioma
  const changeLanguage = useCallback(async (lang) => {
    try {
      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      localStorage.setItem('i18nextLng', lang);

      // Si hay usuario autenticado, guardar preferencia en el backend
      if (user) {
        try {
          await api.put('/settings', { default_language: lang });
        } catch (e) {
          console.error('Error al guardar preferencia de idioma:', e);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error al cambiar idioma:', error);
      return { success: false, error: error.message };
    }
  }, [i18n, user]);

  const value = {
    currentLanguage,
    loading,
    changeLanguage,
    supportedLanguages: [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
    ],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};