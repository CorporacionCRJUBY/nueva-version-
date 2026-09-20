// FILE: frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../ui/cn';

/**
 * Página de inicio de sesión (email + contraseña, con segundo factor).
 *
 * Migrada por completo a Tailwind CSS. Se conserva toda la lógica original:
 *   - flujo de 2FA: si la cuenta tiene el segundo factor activo, `login()`
 *     devuelve `{ twoFactorRequired: true, challengeToken }` y se muestra el
 *     formulario del código TOTP/de respaldo vía `verifyTwoFactor`.
 *   - redirección al destino original (`location.state.from`) tras el login.
 *   - estado de carga, mensajes de error i18n y visor de contraseña.
 *
 * Notas de la auditoría previa (se mantienen):
 *   - el checkbox "remember me" era código muerto (nunca se enviaba) y se
 *     eliminó junto con su estado;
 *   - el enlace "forgot password" apuntaba a una ruta inexistente y también
 *     se eliminó.
 */
const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyTwoFactor } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Segundo factor
  const [challengeToken, setChallengeToken] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else if (result.twoFactorRequired) {
        setChallengeToken(result.challengeToken);
      } else {
        setError(result.error || t('auth.loginError'));
      }
    } catch (err) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await verifyTwoFactor(challengeToken, twoFactorCode.trim());
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || t('auth.twoFactor.invalidCode'));
      }
    } catch (err) {
      setError(err.message || t('auth.twoFactor.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  /** Alerta de error reutilizable. */
  const ErrorAlert = ({ children }) =>
    children ? (
      <div
        role="alert"
        className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-light px-3.5 py-2.5 text-sm text-danger-dark"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </div>
    ) : null;

  /** Spinner para los botones de envío. */
  const Spinner = () => (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  );

  // ---------------------------------------------------------------------
  // Formulario del segundo factor
  // ---------------------------------------------------------------------
  if (challengeToken) {
    return (
      <AuthLayout title={t('auth.twoFactor.title')} subtitle={t('auth.twoFactor.subtitle')}>
        <form onSubmit={handleTwoFactorSubmit} className="mt-1 w-full">
          <ErrorAlert>{error}</ErrorAlert>

          <label htmlFor="twofa-code" className="field-label">
            {t('auth.twoFactor.codeLabel')}
          </label>
          <input
            id="twofa-code"
            name="twofa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            required
            autoFocus
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            aria-describedby="twofa-help"
            className="field"
          />
          <p id="twofa-help" className="field-helper">
            {t('auth.twoFactor.codeHelper')}
          </p>

          <button
            type="submit"
            disabled={loading || !twoFactorCode.trim()}
            className="btn btn-primary btn-lg mt-6 w-full py-3 text-[0.95rem]"
          >
            {loading ? <Spinner /> : t('auth.twoFactor.verify')}
          </button>

          <button
            type="button"
            className="btn btn-ghost mt-2 w-full"
            onClick={() => {
              setChallengeToken(null);
              setTwoFactorCode('');
              setError(null);
            }}
          >
            {t('auth.twoFactor.backToLogin')}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // ---------------------------------------------------------------------
  // Formulario principal
  // ---------------------------------------------------------------------
  return (
    <AuthLayout title={t('auth.welcome')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit} className="mt-1 w-full">
        <ErrorAlert>{error}</ErrorAlert>

        {/* Email */}
        <label htmlFor="login-email" className="field-label">
          {t('auth.email')}
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field pl-10"
          />
        </div>

        {/* Contraseña */}
        <label htmlFor="login-password" className="field-label mt-4">
          {t('auth.password')}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-2 text-ink-muted transition-colors hover:bg-hover hover:text-ink-soft"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'btn btn-lg mt-7 mb-2 w-full py-3.5 text-[0.95rem] font-bold',
            'bg-brand-gradient shadow-brand hover:brightness-110',
            'hover:shadow-brand-lg'
          )}
        >
          {loading ? <Spinner /> : t('auth.login')}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
