// FILE: frontend/src/ui/cn.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases condicionales (clsx) resolviendo conflictos de Tailwind
 * (tailwind-merge). Ej: cn('p-2', cond && 'p-4') -> 'p-4'.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
