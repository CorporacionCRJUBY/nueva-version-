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

/** Acentos disponibles (clases literales: Tailwind las lee del código fuente). */
const ACCENTS = {
  brand: 'bg-gradient-to-br from-brand-700 to-brand-500',
  deep: 'bg-gradient-to-br from-violet-900 to-brand-600',
  lilac: 'bg-gradient-to-br from-brand-500 to-brand-400',
  royal: 'bg-gradient-to-br from-brand-800 to-brand-500',
  soft: 'bg-gradient-to-br from-brand-400 to-brand-300',
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
  const body = (
    <>
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-brand',
          ACCENTS[accent] || ACCENTS.brand
        )}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-ink">{value}</p>
        <p className="mt-1.5 truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {hint && <p className="mt-1 truncate text-xs text-ink-soft">{hint}</p>}
      </div>
    </>
  );

  const classes = cn(
    'group relative flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm',
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
  <div className={cn('flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm', className)}>
    <SkeletonBlock className="h-11 w-11 rounded-xl" />
    <div className="min-w-0 flex-1 space-y-2">
      <SkeletonBlock className="h-6 w-16" />
      <SkeletonLine className="h-3 w-24" />
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
