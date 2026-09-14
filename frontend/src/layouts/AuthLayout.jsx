// FILE: frontend/src/layouts/AuthLayout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, Users, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GlobalErrorSnackbar from '../components/GlobalErrorSnackbar';
import Logo from '../components/Logo';

/**
 * Layout de autenticación: panel de marca + panel de formulario.
 *
 * REDISEÑO VISUAL: panel de marca en azul marino profundo con acento azul
 * (lenguaje visual del panel de referencia). Conserva el idioma, el logo, los
 * textos i18n y el snackbar global de errores.
 */
const AuthLayout = ({ children, title, subtitle }) => {
  const { t } = useTranslation();

  const highlights = [
    { icon: <TrendingUp className="h-4 w-4" />, text: t('auth.brand.highlightReports') },
    { icon: <Users className="h-4 w-4" />, text: t('auth.brand.highlightManagement') },
    { icon: <Shield className="h-4 w-4" />, text: t('auth.brand.highlightSecurity') },
  ];

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-canvas p-0 md:p-6">
      <div className="flex m-auto w-full max-w-6xl overflow-hidden rounded-none shadow-xl md:rounded-2xl">
        {/* ---------- Panel de marca ---------- */}
        <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-hero-gradient p-10 text-white md:flex lg:p-12">
          {/* Orbes decorativos + retícula */}
          <div
            className="orb pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(120,71,227,0.32), transparent 70%)' }}
            aria-hidden="true"
          />
          <div
            className="orb pointer-events-none absolute -right-16 bottom-16 h-[300px] w-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(173,147,251,0.26), transparent 70%)',
              animationDelay: '2s',
            }}
            aria-hidden="true"
          />
          <div
            className="orb-float pointer-events-none absolute right-[15%] top-[30%] h-44 w-44 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(147,197,253,0.18), transparent 70%)',
              animationDelay: '1s',
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid" aria-hidden="true" />

          <div className="relative z-10">
            <Logo showText size={48} text="NEW DIRECTION ACADEMY" textColor="light" fontSize="1.05rem" letterSpacing={1} />
          </div>

          <div className="relative z-10">
            <h2 className="mb-4 max-w-md bg-gradient-to-br from-white via-brand-200 to-brand-400 bg-clip-text font-display text-3xl font-extrabold leading-tight text-transparent lg:text-4xl">
              {t('auth.brand.heading')}
            </h2>
            <p className="mb-8 max-w-sm text-sm font-normal text-white/85">
              {t('auth.brand.description')}
            </p>

            <ul className="space-y-4">
              {highlights.map((h) => (
                <li key={h.text} className="flex items-center gap-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.14] text-brand-200">
                    {h.icon}
                  </span>
                  <span className="text-sm text-white/90">{h.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-white/55">
            {t('auth.brand.rights', { year: new Date().getFullYear() })}
          </p>
        </div>

        {/* ---------- Panel de formulario ---------- */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-surface p-8 sm:p-12">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(120,71,227,0.05) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-sm">
            <div className="mb-8 md:hidden">
              <Logo size={42} fontSize="0.95rem" withGlow />
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mb-6 mt-1.5 text-sm text-ink-soft">{subtitle}</p>}

            {children}
          </div>
        </div>
      </div>

      <GlobalErrorSnackbar />
    </div>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

export default AuthLayout;
