// FILE: frontend/src/pages/ForbiddenPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Lock } from 'lucide-react';

/** Página 403. Migrada a Tailwind CSS. */
const ForbiddenPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-hero-gradient p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-60" aria-hidden="true" />

      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-line bg-surface p-10 text-center shadow-xl">
        <Lock className="mx-auto mb-2 h-16 w-16 text-danger" aria-hidden="true" />
        <div className="gradient-text font-display text-[96px] font-black leading-none opacity-85">403</div>
        <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">{t('forbidden.title')}</h1>
        <p className="mb-7 text-sm text-ink-soft">{t('forbidden.message')}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <Home className="h-4 w-4" />
          {t('forbidden.goHome')}
        </button>
      </div>
    </div>
  );
};

export default ForbiddenPage;
