// FILE: frontend/src/components/Skeleton.jsx
import React from 'react';
import { cn } from '../ui/cn';

/**
 * Skeleton — primitivas de carga compartidas.
 *
 * El dashboard y la capa de formularios necesitaban estados de carga con el
 * mismo lenguaje visual (en vez del `CircularProgress` genérico heredado).
 * Se centralizan aquí para que ambos consumidores pinten exactamente la misma
 * textura y no haya dos estilos de "cargando" conviviendo.
 */

/** Bloque base con brillo animado. */
export const SkeletonBlock = ({ className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'block animate-pulse rounded-md bg-gradient-to-r from-surface-3 via-brand-100 to-surface-3',
      className
    )}
  />
);

/** Línea de texto esqueletada. */
export const SkeletonLine = ({ className }) => (
  <SkeletonBlock className={cn('h-3.5 w-full rounded-full', className)} />
);

/** Tarjeta esqueletada con encabezado + cuerpo. */
export const SkeletonCard = ({ className, lines = 3 }) => (
  <div className={cn('overflow-hidden rounded-xl border border-line bg-surface shadow-sm', className)}>
    <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-4">
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonLine className="h-4 w-40" />
    </div>
    <div className="space-y-3 p-5">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  </div>
);

export default SkeletonBlock;
