// FILE: frontend/src/components/DashboardWidgets.jsx
/**
 * DashboardWidgets — piezas reutilizables del panel principal.
 *
 * El dashboard tenía seis tarjetas de KPI pintadas a mano con `sx`, sin
 * estados vacíos, sin esqueleto de carga y sin panel contenedor para los
 * bloques de gráficos/tablas. Estas primitivas dan a cada bloque del panel el
 * mismo lenguaje visual morado/lila y resuelven de una vez los tres estados
 * (cargando / vacío / con datos) que antes no existían.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../ui/cn';
import { SkeletonBlock, SkeletonLine } from './Skeleton';

/* ---------------------------------------------------------------------------
 * StatCard
 * ------------------------------------------------------------------------- */

/** Acentos disponibles (clases literales: Tailwind las lee del código fuente).
 *  La referencia usa un mosaico TENUE con el icono, no un bloque saturado. */
const ACCENTS = {
  brand: 'bg-brand-100 text-brand-700',
  deep: 'bg-violet-100 text-violet-900',
  lilac: 'bg-brand-50 text-brand-600',
  royal: 'bg-brand-200 text-brand-800',
  soft: 'bg-brand-100 text-brand-500',
};

/**
 * Tarjeta de KPI.
 *
 * @param {string}   label    Métrica.
 * @param {number}   value    Valor principal.
 * @param {Function} icon     Icono lucide.
 * @param {string}   accent   Clave de acento (brand | deep | lilac | royal | soft).
 * @param {string}   hint     Contexto bajo el valor (p. ej. "12 activos").
 * @param {string}   to       Ruta opcional: hace la tarjeta navegable.
 */
export const StatCard = ({ label, value, icon: Icon, accent = 'brand', hint, to, className }) => {
  // Distribución de la referencia: etiqueta + valor a la izquierda, mosaico
  // del icono arriba a la derecha.
  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {/* `tracking-normal` (no `wider`) y `break-words`: el tracking ancho
            recortaba los nombres largos («ATTENDANC…») y `truncate` impide que
            una palabra larga baje de línea. Con `break-words` la etiqueta
            envuelve en vez de cortarse. */}
        <p className="mb-1 break-words text-2xs font-semibold uppercase tracking-normal text-ink-muted">
          {label}
        </p>
        <p className="font-display text-2xl font-bold leading-none tabular-nums text-ink sm:text-3xl xl:text-[1.65rem]">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          ACCENTS[accent] || ACCENTS.brand
        )}
      >
        {Icon && <Icon className="h-[18px] w-[18px]" />}
      </span>
    </div>
  );

  const classes = cn(
    'group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm',
    'transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md',
    className
  );

  return to ? (
    <Link to={to} data-testid="stat-card" className={classes}>
      {body}
    </Link>
  ) : (
    <div data-testid="stat-card" className={classes}>{body}</div>
  );
};

/* ---------------------------------------------------------------------------
 * Panel
 * ------------------------------------------------------------------------- */

/** Panel contenedor de un bloque del dashboard (gráfico, tabla, lista). */
export const Panel = ({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}) => (
  <section
    className={cn(
      'flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm',
      className
    )}
  >
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            {title && <h2 className="font-display text-sm font-bold tracking-tight text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
  </section>
);

/* ---------------------------------------------------------------------------
 * EmptyState
 * ------------------------------------------------------------------------- */

/** Estado vacío explícito (antes el panel quedaba en blanco sin explicación). */
export const EmptyState = ({ icon: Icon, title, description, action, className, compact = false }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'gap-1.5 py-8' : 'gap-2 py-12',
      className
    )}
  >
    {Icon && (
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-400 ring-1 ring-inset ring-brand-100">
        <Icon className="h-5 w-5" />
      </span>
    )}
    <p className="text-sm font-semibold text-ink-soft">{title}</p>
    {description && <p className="max-w-sm text-xs leading-5 text-ink-muted">{description}</p>}
    {action}
  </div>
);

/* ---------------------------------------------------------------------------
 * Estados de carga
 * ------------------------------------------------------------------------- */

/** Esqueleto de una tarjeta de KPI. */
export const StatCardSkeleton = ({ className }) => (
  <div
    className={cn(
      'flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-sm',
      className
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <SkeletonLine className="mb-2 h-3 w-20" />
        <SkeletonBlock className="h-7 w-14" />
      </div>
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-lg" />
    </div>
  </div>
);

/** Esqueleto de un panel (encabezado + cuerpo). */
export const PanelSkeleton = ({ className, height = 200 }) => (
  <div className={cn('overflow-hidden rounded-xl border border-line bg-surface shadow-sm', className)}>
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonLine className="h-4 w-40" />
    </div>
    <div className="p-5">
      <SkeletonBlock className="w-full rounded-lg" style={{ height }} />
    </div>
  </div>
);

export default StatCard;
