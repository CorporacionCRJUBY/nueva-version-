// FILE: frontend/src/ui/tokens.js
/**
 * Tokens de diseño en JavaScript.
 *
 * Son el espejo en JS de `tailwind.config.js` y `index.css`. Se usan
 * exclusivamente para resolver los valores de la API `sx` heredada
 * (p. ej. `color: 'primary.main'`, `bgcolor: 'background.paper'`) cuando se
 * convierten a estilos inline. Las clases Tailwind son la fuente de verdad
 * para todo el diseño nuevo.
 */

export const palette = {
  // REDISEÑO VISUAL: azul de acento (antes morado académico).
  brand: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  // Superficie corporativa del sidebar (azul marino profundo).
  lilac: {
    100: '#ede9fe',
    200: '#cbb8f0',
    300: '#a48fc9',
    400: '#7a5aa8',
    500: '#4a2270',
    600: '#2d1b69',
  },
  ink: '#1e1b4b',
  inkSoft: '#6b5b95',
  inkMuted: '#7c6faa',
  surface: '#ffffff',
  surface2: '#f5f3ff',
  canvas: '#f5f3ff',
  hover: '#f5f3ff',
  line: '#ddd6fe',
  lineStrong: '#c4b5fd',
  sidebar: '#1e1b4b',
  sidebarDeep: '#191241',
  success: '#047857',
  warning: '#b45309',
  danger: '#b91c1c',
  info: '#7c3aed',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
  accent: 'linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)',
  hero: 'linear-gradient(160deg, #1e1b4b 0%, #2d1b69 55%, #6d28d9 100%)',
};

export const shadows = {
  sm: '0 1px 3px rgba(30,27,75,0.06), 0 1px 2px rgba(30,27,75,0.04)',
  md: '0 4px 12px rgba(30,27,75,0.08), 0 1px 3px rgba(30,27,75,0.04)',
  lg: '0 12px 32px rgba(30,27,75,0.12), 0 2px 8px rgba(30,27,75,0.06)',
};

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/** Ancho del sidebar; lo comparten el layout y el contenido principal. */
export const layout = {
  sidebarWidth: 264,
  sidebarCollapsed: 76,
  appbarHeight: 64,
};

/**
 * Resuelve una ruta de color tipo MUI a un valor CSS real.
 * Acepta: 'primary.main', 'text.secondary', 'divider', 'background.paper',
 * 'rgba(...)' y cualquier color CSS literal.
 */
export function resolveColor(value, fallback = 'inherit') {
  if (value == null) return fallback;
  if (typeof value !== 'string') return fallback;

  // Colores CSS literales (hex, rgb(a), hsl(a), nombres, gradientes, var()).
  if (/^(#|rgb|hsl|var\(|linear-gradient|radial-gradient|transparent|currentColor|inherit)/i.test(value)) {
    return value;
  }

  const [group, key] = value.split('.');

  const map = {
    primary: { main: palette.brand[600], light: palette.brand[400], dark: palette.brand[800], contrastText: '#ffffff' },
    secondary: { main: palette.brand[400], light: palette.brand[300], dark: palette.brand[600], contrastText: '#ffffff' },
    success: { main: palette.success, light: '#ecfdf5', dark: '#047857', contrastText: '#ffffff' },
    warning: { main: palette.warning, light: '#fffbeb', dark: '#b45309', contrastText: '#ffffff' },
    error: { main: palette.danger, light: '#fef2f2', dark: '#b91c1c', contrastText: '#ffffff' },
    danger: { main: palette.danger, light: '#fef2f2', dark: '#b91c1c', contrastText: '#ffffff' },
    info: { main: palette.info, light: '#f5f3ff', dark: '#6d28d9', contrastText: '#ffffff' },
    text: { primary: palette.ink, secondary: palette.inkSoft, disabled: palette.inkMuted },
    background: { default: palette.canvas, paper: palette.surface },
    action: { hover: 'rgba(124,58,237,0.05)', selected: 'rgba(124,58,237,0.10)', disabled: palette.inkMuted },
    divider: palette.line,
  };

  if (group === 'divider') return palette.line;

  const entry = map[group];
  if (!entry) return fallback;
  if (key == null) return typeof entry === 'string' ? entry : fallback;
  return entry[key] ?? fallback;
}
