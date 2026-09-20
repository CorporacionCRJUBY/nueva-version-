// FILE: frontend/src/components/GlobalErrorSnackbar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../ui/cn';

/**
 * Escucha el evento global `academix:api-error` que despacha el interceptor de
 * axiosClient (ver frontend/src/api/axiosClient.js) cada vez que una petición
 * falla con algo distinto de un 401 (que ya maneja el flujo de refresh/logout)
 * o una cancelación. Se monta una sola vez por layout.
 *
 * Migrado a Tailwind CSS (antes: Snackbar + Alert de MUI).
 * La API pública no cambió: se sigue usando como <GlobalErrorSnackbar />.
 */
const AUTO_HIDE_MS = 6000;

const GlobalErrorSnackbar = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleApiError = useCallback((event) => {
    setMessage(event.detail?.message || 'Ha ocurrido un error inesperado.');
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('academix:api-error', handleApiError);
    return () => window.removeEventListener('academix:api-error', handleApiError);
  }, [handleApiError]);

  // Auto-cierre (equivalente a autoHideDuration de MUI).
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [open, message]);

  if (!open) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed bottom-6 left-1/2 z-snackbar -translate-x-1/2',
        'flex max-w-[calc(100vw-2rem)] animate-fade-in items-start gap-3',
        'rounded-lg border border-danger/30 bg-danger px-4 py-3 text-white shadow-lg'
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar"
        className="ml-2 rounded p-0.5 transition-colors hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default GlobalErrorSnackbar;
