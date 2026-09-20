// FILE: frontend/src/components/QuickCreateDrawer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../ui/cn';

/**
 * QuickCreateDrawer — creación de registros SIN salir de la lista.
 *
 * PROBLEMA QUE RESUELVE (usabilidad para funcionarios):
 *   El flujo anterior obligaba a: lista → clic en «Nuevo» → página completa
 *   de formulario → guardar → volver a la lista. Tres navegaciones y una
 *   pérdida de contexto por cada registro. En una secretaría que da de alta
 *   decenas de estudiantes el primer día de clases, eso es lento y propenso
 *   a errores.
 *
 * SOLUCIÓN:
 *   Un panel lateral (drawer) que se abre encima de la lista, con el
 *   formulario mínimo necesario. Al guardar, la lista se refresca en sitio y
 *   el funcionario sigue donde estaba. No hay navegación ni pérdida de
 *   filtros, búsqueda ni paginación.
 *
 * Características:
 *   - Campos declarativos (`fields`) con tipos text, email, teléfono, fecha,
 *     número, select y textarea.
 *   - Validación en cliente: obligatorios, formato de email y fecha; muestra
 *     el primer error bajo el campo y no envía la petición.
 *   - Estado de envío (spinner + bloqueo del botón) para evitar doble alta.
 *   - Errores del servidor mostrados en un banner legible (409, 400, 403...).
 *   - Cierre con Escape y clic en el fondo; el foco va al primer campo.
 */

/** Tipos de input soportados y su mapeo al control nativo. */
const INPUT_TYPES = {
  text: 'text',
  email: 'email',
  tel: 'tel',
  date: 'date',
  number: 'number',
};

const QuickCreateDrawer = ({
  open,
  title,
  subtitle,
  fields = [],
  initialValues = {},
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  onSubmit,
  onClose,
}) => {
  const emptyValues = useMemo(() => {
    const base = {};
    fields.forEach((f) => {
      base[f.name] = initialValues[f.name] ?? (f.type === 'select' ? (f.defaultValue ?? '') : '');
    });
    return base;
  }, [fields, initialValues]);

  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Al abrir (o cambiar la definición de campos) se parte de valores limpios:
  // un drawer reutilizado no debe arrastrar lo que se escribió la vez anterior.
  useEffect(() => {
    if (open) {
      setValues(emptyValues);
      setErrors({});
      setServerError(null);
      setSuccess(false);
      setSubmitting(false);
      // Foco al primer campo para poder empezar a escribir sin usar el ratón.
      setTimeout(() => {
        const first = document.querySelector('[data-quick-create-field]');
        if (first) first.focus();
      }, 60);
    }
  }, [open, emptyValues]);

  // Escape cierra el panel (salvo mientras se está guardando).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError(null);
  };

  /** Validación en cliente antes de tocar la red. */
  const validate = () => {
    const next = {};
    fields.forEach((f) => {
      const raw = values[f.name];
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (f.required && (value === '' || value == null)) {
        next[f.name] = `${f.label} es obligatorio`;
        return;
      }
      if (value === '' || value == null) return;
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        next[f.name] = 'Correo electrónico no válido';
      }
      if (f.type === 'date' && Number.isNaN(new Date(value).getTime())) {
        next[f.name] = 'Fecha no válida';
      }
      if (f.maxLength && String(value).length > f.maxLength) {
        next[f.name] = `Máximo ${f.maxLength} caracteres`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);
    try {
      // Se construye el payload con los campos declarados: así nunca se envía
      // un campo de más (mass assignment) ni se cuela un valor de UI.
      const payload = {};
      fields.forEach((f) => {
        const raw = values[f.name];
        const value = typeof raw === 'string' ? raw.trim() : raw;
        if (value === '' || value == null) {
          if (f.optionalNull) payload[f.name] = null;
          return;
        }
        payload[f.name] = f.type === 'number' ? Number(value) : value;
      });

      await onSubmit?.(payload);
      setSuccess(true);
      // Breve confirmación visual antes de cerrar, para que quien captura
      // vea que el registro sí se guardó.
      setTimeout(() => {
        onClose?.();
      }, 650);
    } catch (err) {
      // El backend responde con { success:false, error:{ message, details } }.
      const message =
        err?.error?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'No se pudo guardar el registro';
      setServerError(message);

      // Si el servidor devolvió errores por campo, se pintan junto al campo.
      const details = err?.error?.details || err?.response?.data?.error?.details;
      if (Array.isArray(details)) {
        const mapped = {};
        details.forEach((d) => {
          if (d?.path && !mapped[d.path]) mapped[d.path] = d.msg || 'Valor inválido';
        });
        if (Object.keys(mapped).length) setErrors(mapped);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (f) => {
    const id = `qc-${f.name}`;
    const common = {
      id,
      'data-quick-create-field': f.name,
      value: values[f.name] ?? '',
      disabled: submitting || success,
      onChange: (e) => setValue(f.name, e.target.value),
      className: cn(
        'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink outline-none transition',
        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25',
        errors[f.name] ? 'border-danger' : 'border-line'
      ),
    };

    if (f.type === 'select') {
      return (
        <select {...common}>
          <option value="">{f.placeholder || 'Selecciona…'}</option>
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === 'textarea') {
      return <textarea {...common} rows={f.rows || 3} placeholder={f.placeholder} />;
    }
    return (
      <input
        {...common}
        type={INPUT_TYPES[f.type] || 'text'}
        placeholder={f.placeholder}
        maxLength={f.maxLength}
        autoComplete={f.autoComplete || 'off'}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-modal flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* Fondo: cierra al hacer clic (no mientras se guarda) */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => !submitting && onClose?.()}
        className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="relative flex h-full w-full max-w-lg animate-slide-in-right flex-col bg-surface shadow-lg"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose?.()}
            aria-label="Cerrar"
            className="focus-ring rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo: los campos se reparten en dos columnas cuando el campo lo pide */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={cn(f.fullWidth ? 'sm:col-span-2' : 'sm:col-span-1')}>
                <label htmlFor={`qc-${f.name}`} className="mb-1 block text-xs font-semibold text-ink-soft">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-danger">*</span>}
                </label>
                {renderField(f)}
                {errors[f.name] ? (
                  <p className="mt-1 text-xs text-danger">{errors[f.name]}</p>
                ) : (
                  f.hint && <p className="mt-1 text-xs text-ink-muted">{f.hint}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pie de acciones */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3">
          <span className="text-xs text-ink-muted">
            {success ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" /> Guardado correctamente
              </span>
            ) : (
              'Los campos con * son obligatorios'
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !submitting && onClose?.()}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-hover"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-brand transition',
                'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70'
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Guardando…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuickCreateDrawer;
