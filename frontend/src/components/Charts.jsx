// FILE: frontend/src/components/Charts.jsx
/**
 * Charts — gráficos del dashboard sin dependencias externas.
 *
 * Se implementan en SVG/CSS puro (no se añadió ninguna librería de charts al
 * `package.json`) por tres razones: el bundle no crece, funcionan en SSR/test
 * sin `ResizeObserver`, y heredan directamente los tokens morado/lila del
 * design system.
 *
 * Cada componente incluye su propio estado vacío para que el dashboard nunca
 * muestre un lienzo en blanco sin explicación.
 */
import React from 'react';
import { cn } from '../ui/cn';

/* ---------------------------------------------------------------------------
 * BarChart
 * ------------------------------------------------------------------------- */

/**
 * Gráfico de barras verticales.
 *
 * @param {Array}  data           [{ label, value }]
 * @param {number} height         Altura del área de barras en px.
 * @param {string} emptyLabel     Texto cuando no hay datos.
 * @param {Function} valueFormatter Formato del valor mostrado sobre la barra.
 */
export const BarChart = ({
  data = [],
  height = 176,
  emptyLabel = 'Sin datos',
  valueFormatter = (v) => v,
  className,
}) => {
  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center text-sm text-ink-muted', className)} style={{ height }}>
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));

  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const value = Number(d.value) || 0;
          const pct = Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100));
          return (
            <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-2xs font-bold tabular-nums text-ink-soft">{valueFormatter(value)}</span>
              <div
                className="w-full rounded-t-lg bg-brand-gradient transition-[height] duration-500 ease-smooth"
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${valueFormatter(value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {data.map((d) => (
          <span key={d.label} className="min-w-0 flex-1 truncate text-center text-2xs font-medium text-ink-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * DonutChart
 * ------------------------------------------------------------------------- */

/**
 * Gráfico de anillo con leyenda opcional.
 *
 * @param {Array}  data        [{ label, value, color }] — `color` es un valor CSS.
 * @param {number} size        Diámetro en px.
 * @param {number} thickness   Grosor del anillo en px.
 * @param {string} centerValue Valor grande del centro.
 * @param {string} centerLabel Etiqueta pequeña del centro.
 */
export const DonutChart = ({
  data = [],
  size = 168,
  thickness = 20,
  centerValue,
  centerLabel,
  className,
}) => {
  const items = data.filter((d) => (Number(d.value) || 0) > 0);
  const total = items.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = items.map((d) => {
    const value = Number(d.value) || 0;
    const length = total ? (value / total) * circumference : 0;
    const segment = { ...d, value, length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-6', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ddd6fe"
            strokeWidth={thickness}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((s) => (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${s.length} ${circumference - s.length}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
            {centerValue ?? total}
          </span>
          {centerLabel && <span className="mt-0.5 text-2xs font-medium uppercase tracking-wide text-ink-muted">{centerLabel}</span>}
        </div>
      </div>

      <ul className="min-w-[9rem] space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{d.label}</span>
            <span className="font-semibold tabular-nums text-ink">{Number(d.value) || 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * ProgressBar
 * ------------------------------------------------------------------------- */

const PROGRESS_TONES = {
  brand: 'bg-brand-gradient',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Barra de progreso con etiqueta y valor opcionales. */
export const ProgressBar = ({
  value = 0,
  max = 100,
  label,
  valueLabel,
  tone = 'brand',
  className,
}) => {
  const safeMax = Number(max) || 100;
  const pct = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100));

  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="truncate text-xs font-medium text-ink-soft">{label}</span>}
          {valueLabel && <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">{valueLabel}</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-smooth', PROGRESS_TONES[tone] || PROGRESS_TONES.brand)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default BarChart;
