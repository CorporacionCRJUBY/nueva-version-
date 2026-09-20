// FILE: frontend/src/components/FormKit.jsx
/**
 * FormKit — capa compartida de formularios de ACADEMIX 2.0.
 *
 * PROBLEMA QUE RESUELVE
 *   Los 31 formularios del sistema (`*FormPage.jsx`) repetían a mano el mismo
 *   andamiaje: un `Box` con un `Typography className="gradient-text"` de
 *   título, un `Paper` con `borderTop: 4px solid primary.main` por sección, un
 *   `Divider` de separación y un `Box` final con los botones. Además de ser
 *   ~1.500 líneas de duplicación, cada módulo había derivado en variantes
 *   (unos con borde superior, otros sin él, unos con encabezado y línea
 *   inferior, otros no), así que el sistema NO tenía un diseño coherente.
 *
 * SOLUCIÓN
 *   Una sola librería de primitivas con el lenguaje visual morado/lila del
 *   design system. Las páginas declaran QUÉ quieren (una sección con título,
 *   una rejilla de campos, una barra de acciones) y el aspecto queda
 *   centralizado aquí: cambiar un token restiliza los 31 formularios.
 *
 * Componentes exportados:
 *   PageHeader    — cabecera de página (volver, icono, título, acciones, borrar)
 *   FormSection   — tarjeta de sección con encabezado y descripción
 *   FormGrid      — rejilla de 12 columnas (sustituye a MUI <Grid container>)
 *   FormCol       — columna de la rejilla (sustituye a MUI <Grid size={{...}}>)
 *   FormActions   — barra de acciones inferior (guardar / cancelar)
 *   ErrorBanner   — aviso en línea para errores de validación o de red
 *   FormLoading   — estado de carga esqueletado
 *   FieldHint     — texto de ayuda bajo un campo
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Trash2 } from 'lucide-react';
import { cn } from '../ui/cn';
import { SkeletonBlock, SkeletonLine } from './Skeleton';

/* ---------------------------------------------------------------------------
 * PageHeader
 * ------------------------------------------------------------------------- */

/**
 * Cabecera única de las páginas con formulario.
 *
 * @param {string}   title          Título principal.
 * @param {string}   subtitle       Línea de contexto bajo el título.
 * @param {Function} icon           Icono lucide de la cabecera.
 * @param {string}   backTo         Ruta del enlace "volver" (Link de react-router).
 * @param {Function} onBack         Alternativa a `backTo` para volver con lógica propia.
 * @param {Function} onDelete       Si se pasa, pinta el botón de eliminar.
 * @param {string}   deleteLabel    Texto del botón de eliminar.
 * @param {boolean}  deleteDisabled Deshabilita el botón de eliminar.
 * @param {node}     children       Acciones adicionales alineadas a la derecha.
 */
export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  backTo,
  backLabel,
  onBack,
  onDelete,
  deleteLabel,
  deleteDisabled = false,
  children,
  className,
}) => {
  const backClasses =
    'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface ' +
    'text-ink-soft transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700';

  return (
    <header
      data-testid="page-header"
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {backTo ? (
          <Link to={backTo} aria-label={backLabel} className={backClasses}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          onBack && (
            <button type="button" onClick={onBack} aria-label={backLabel} className={backClasses}>
              <ArrowLeft className="h-4 w-4" />
            </button>
          )
        )}

        {Icon && (
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-white shadow-brand">
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        </div>
      </div>

      {(children || onDelete) && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteDisabled}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-light px-3.5 py-2',
                'text-sm font-semibold text-danger transition-colors duration-200',
                'hover:bg-danger hover:text-white disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              <Trash2 className="h-4 w-4" />
              {deleteLabel}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

/* ---------------------------------------------------------------------------
 * FormSection
 * ------------------------------------------------------------------------- */

/**
 * Tarjeta de sección de formulario: encabezado con icono + título + descripción
 * y cuerpo con los campos. Sustituye al `Paper` con borde superior morado.
 */
export const FormSection = ({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}) => (
  <section
    data-testid="form-section"
    className={cn(
      'overflow-hidden rounded-lg border border-line bg-surface shadow-sm',
      className
    )}
  >
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200">
            {Icon ? (
              <Icon className="h-4 w-4" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-sm font-bold tracking-tight text-ink">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={cn('p-5', bodyClassName)}>{children}</div>
  </section>
);

/* ---------------------------------------------------------------------------
 * FormGrid / FormCol
 * ------------------------------------------------------------------------- */

/**
 * Mapa estático de clases de columna.
 *
 * IMPORTANTE: son cadenas LITERALES a propósito. Tailwind descubre las clases
 * leyendo el código fuente, así que una clase construida en tiempo de
 * ejecución (`col-span-${n}`) no llegaría nunca al CSS generado y la rejilla
 * se rompería en producción.
 */
const SPAN = {
  xs: {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
    9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12',
  },
  sm: {
    1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4',
    5: 'sm:col-span-5', 6: 'sm:col-span-6', 7: 'sm:col-span-7', 8: 'sm:col-span-8',
    9: 'sm:col-span-9', 10: 'sm:col-span-10', 11: 'sm:col-span-11', 12: 'sm:col-span-12',
  },
  md: {
    1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
    5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
    9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12',
  },
  lg: {
    1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4',
    5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8',
    9: 'lg:col-span-9', 10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12',
  },
  xl: {
    1: 'xl:col-span-1', 2: 'xl:col-span-2', 3: 'xl:col-span-3', 4: 'xl:col-span-4',
    5: 'xl:col-span-5', 6: 'xl:col-span-6', 7: 'xl:col-span-7', 8: 'xl:col-span-8',
    9: 'xl:col-span-9', 10: 'xl:col-span-10', 11: 'xl:col-span-11', 12: 'xl:col-span-12',
  },
};

/**
 * Rejilla de 12 columnas para campos de formulario.
 *
 * @param {'normal'|'loose'} gap  Separación entre celdas (16px o 20px).
 * @param {number} spacing        Compatibilidad con la API de MUI Grid
 *                                (2 = normal, 3 = loose).
 */
export const FormGrid = ({ children, className, gap = 'normal', spacing, ...rest }) => {
  const loose = gap === 'loose' || spacing === 3 || spacing === '3';
  return (
    <div
      className={cn('grid grid-cols-12', loose ? 'gap-x-5 gap-y-5' : 'gap-x-4 gap-y-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
};

/**
 * Columna de la rejilla.
 *
 * @param {number|object} size  Ancho, o mapa responsive `{ xs, sm, md, lg, xl }`
 *                              con el mismo contrato que la prop `size` de MUI Grid.
 */
export const FormCol = ({ size = 12, children, className, as: Tag = 'div', ...rest }) => {
  const spec = typeof size === 'number' || typeof size === 'string' ? { xs: Number(size) } : size || {};
  const classes = [];

  if (spec.xs == null) classes.push(SPAN.xs[12]);
  for (const bp of ['xs', 'sm', 'md', 'lg', 'xl']) {
    const value = spec[bp];
    if (value == null) continue;
    const cls = SPAN[bp][value];
    if (cls) classes.push(cls);
  }

  return (
    <Tag className={cn(classes.join(' '), className)} {...rest}>
      {children}
    </Tag>
  );
};

/* ---------------------------------------------------------------------------
 * FormActions
 * ------------------------------------------------------------------------- */

/**
 * Barra inferior de acciones del formulario. Se mantiene visible mientras se
 * rellena un formulario largo (sticky) para que guardar no obligue a bajar.
 */
export const FormActions = ({ children, className, sticky = true, note }) => (
  <div
    data-testid="form-actions"
    className={cn(
      'flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white/90 px-4 py-3 shadow-md backdrop-blur-sm',
      sticky && 'sticky bottom-4 z-10',
      className
    )}
  >
    {children}
    {note && <span className="ml-auto text-xs text-ink-muted">{note}</span>}
  </div>
);

/* ---------------------------------------------------------------------------
 * ErrorBanner
 * ------------------------------------------------------------------------- */

const BANNER_TONES = {
  danger: {
    wrapper: 'border-danger/30 bg-danger-light text-danger',
    Icon: AlertCircle,
  },
  warning: {
    wrapper: 'border-warning/30 bg-warning-light text-warning',
    Icon: Info,
  },
  success: {
    wrapper: 'border-success/30 bg-success-light text-success',
    Icon: CheckCircle2,
  },
  info: {
    wrapper: 'border-brand-200 bg-brand-50 text-brand-700',
    Icon: Info,
  },
};

/** Aviso en línea (error de validación, fallo de red, confirmación). */
export const ErrorBanner = ({ message, title, onClose, tone = 'danger', className }) => {
  if (!message) return null;
  const { wrapper, Icon } = BANNER_TONES[tone] || BANNER_TONES.danger;

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', wrapper, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className={cn('font-medium', title && 'mt-0.5 font-normal opacity-90')}>{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-mr-1 shrink-0 rounded p-1 transition-opacity hover:opacity-70"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * FormLoading
 * ------------------------------------------------------------------------- */

/** Estado de carga de un formulario: cabecera + secciones esqueletadas. */
export const FormLoading = ({ sections = 2, fieldsPerSection = 6, className }) => (
  <div className={cn('space-y-6', className)} data-testid="form-loading" aria-busy="true" aria-live="polite">
    <div className="space-y-3 border-b border-line pb-5">
      <SkeletonBlock className="h-8 w-72 max-w-full" />
      <SkeletonLine className="h-4 w-96 max-w-full" />
    </div>

    {Array.from({ length: sections }).map((_, s) => (
      <div key={s} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-4">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonLine className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-12 gap-4 p-5">
          {Array.from({ length: fieldsPerSection }).map((_, f) => (
            <div key={f} className="col-span-12 space-y-2 md:col-span-4">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonBlock className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ---------------------------------------------------------------------------
 * SectionHeading
 * ------------------------------------------------------------------------- */

/**
 * Encabezado de subsección dentro de una sección de formulario.
 *
 * Algunos módulos (usuarios, docentes) agrupan varios bloques dentro de UNA
 * sola tarjeta con subtítulos (`Typography h6` + `Divider`). Este componente
 * da a esos subtítulos el mismo lenguaje visual que el encabezado de
 * `FormSection`, en lugar de dejar el par título/divisor heredado de MUI.
 */
export const SectionHeading = ({ children, className }) => (
  <h2
    className={cn(
      'mb-4 border-b border-line pb-2 font-display text-sm font-bold tracking-tight text-brand-700',
      className
    )}
  >
    {children}
  </h2>
);

/* ---------------------------------------------------------------------------
 * FieldHint
 * ------------------------------------------------------------------------- */

/** Texto de ayuda bajo un campo (complementa al `helperText` de MUI). */
export const FieldHint = ({ children, className }) => (
  <p className={cn('mt-1.5 text-xs leading-5 text-ink-muted', className)}>{children}</p>
);

export default PageHeader;
