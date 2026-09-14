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
    50: '#f7f5ff',
    100: '#f0ebff',
    200: '#e3dbff',
    300: '#cdbcff',
    400: '#ad93fb',
    500: '#8f6bf2',
    600: '#7847e3',
    700: '#6532c4',
    800: '#53289f',
    900: '#3d1c76',
  },
  // Superficie corporativa del sidebar (azul marino profundo).
  lilac: {
    100: '#ece3fb',
    200: '#cbb8f0',
    300: '#a48fc9',
    400: '#7a5aa8',
    500: '#4a2270',
    600: '#2f1657',
  },
  ink: '#1e1233',
  inkSoft: '#564a75',
  inkMuted: '#9c8fbb',
  surface: '#ffffff',
  surface2: '#faf9ff',
  canvas: '#faf9ff',
  hover: '#f4f1fd',
  line: '#ebe4f7',
  lineStrong: '#d8cdee',
  sidebar: '#241046',
  sidebarDeep: '#1a0b33',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#7847e3',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #6532c4 0%, #8f6bf2 100%)',
  accent: 'linear-gradient(135deg, #ad93fb 0%, #cdbcff 100%)',
  hero: 'linear-gradient(160deg, #241046 0%, #2f1657 55%, #6532c4 100%)',
};

export const shadows = {
  sm: '0 1px 3px rgba(30,18,51,0.06), 0 1px 2px rgba(30,18,51,0.04)',
  md: '0 4px 12px rgba(30,18,51,0.08), 0 1px 3px rgba(30,18,51,0.04)',
  lg: '0 12px 32px rgba(30,18,51,0.12), 0 2px 8px rgba(30,18,51,0.06)',
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
    info: { main: palette.info, light: '#f7f5ff', dark: '#6532c4', contrastText: '#ffffff' },
    text: { primary: palette.ink, secondary: palette.inkSoft, disabled: palette.inkMuted },
    background: { default: palette.canvas, paper: palette.surface },
    action: { hover: 'rgba(120,71,227,0.05)', selected: 'rgba(120,71,227,0.10)', disabled: palette.inkMuted },
    divider: palette.line,
  };

  if (group === 'divider') return palette.line;

  const entry = map[group];
  if (!entry) return fallback;
  if (key == null) return typeof entry === 'string' ? entry : fallback;
  return entry[key] ?? fallback;
}
