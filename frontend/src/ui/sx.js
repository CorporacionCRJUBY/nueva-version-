// FILE: frontend/src/ui/sx.js
/**
 * Puente runtime entre la API de estilos `sx` (MUI) y el nuevo sistema
 * Tailwind CSS.
 *
 * ¿Por qué existe?
 *   La aplicación se migró a Tailwind como motor de estilos. Para no romper
 *   NINGUNA de las ~800 declaraciones de estilo existentes (muchas dinámicas,
 *   con variables y condicionales), el codemod reescribe:
 *
 *       sx={{ mb: 2, color: 'primary.main' }}
 *
 *   a:
 *
 *       style={sx({ mb: 2, color: 'primary.main' })}
 *
 *   `sx()` traduce esas declaraciones a CSS real. El diseño NUEVO y las clases
 *   viven en Tailwind (`index.css` + `tailwind.config.js`); este módulo
 *   conserva la fidelidad visual del código heredado.
 *
 * Soporta:
 *   - Objetos y arrays de objetos (`sx={[{...}, {...}]}`, con cascada).
 *   - Atajos de espaciado MUI (p, mb, mx, gap, ...) con la escala 8px.
 *   - Rutas de color del tema ('primary.main', 'text.secondary', 'divider').
 *   - Valores dinámicos y callbacks (`theme => ...`).
 *   - Objetos responsive `{ xs, sm, md, lg, xl }` (reactivos al viewport).
 *   - Propiedades anidadas (`&:hover`, `& svg`, ...), que NO son válidas en
 *     estilos inline y se omiten: su equivalente ahora vive en las clases
 *     Tailwind del design system (`index.css`).
 */

/** Breakpoints, alineados con `tailwind.config.js`. */
const BREAKPOINTS = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 };

let currentWidth = typeof window !== 'undefined' ? window.innerWidth : Number.MAX_SAFE_INTEGER;
const listeners = new Set();

if (typeof window !== 'undefined') {
  const sync = () => {
    // Solo notificamos cuando cambia el breakpoint activo: evita re-renders
    // en cada píxel de un resize.
    const before = activeBreakpoint(currentWidth);
    currentWidth = window.innerWidth;
    if (activeBreakpoint(currentWidth) !== before) {
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('orientationchange', sync, { passive: true });
}

function activeBreakpoint(width) {
  let bp = 'xs';
  for (const [key, min] of Object.entries(BREAKPOINTS)) {
    if (width >= min) bp = key;
  }
  return bp;
}

/** Suscripción para `useSyncExternalStore` (re-render al cambiar breakpoint). */
export function subscribeToViewport(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getViewportBreakpoint() {
  return activeBreakpoint(currentWidth);
}

// ---------------------------------------------------------------------------
// Colores del tema
// ---------------------------------------------------------------------------
const COLOR_MAP = {
  'primary.main': '#7847e3',
  'primary.light': '#8f6bf2',
  'primary.dark': '#3d1c76',
  'primary.contrastText': '#ffffff',
  'secondary.main': '#ad93fb',
  'secondary.light': '#cdbcff',
  'secondary.dark': '#7847e3',
  'success.main': '#047857',
  'success.light': '#ecfdf5',
  'success.dark': '#047857',
  'warning.main': '#b45309',
  'warning.light': '#fffbeb',
  'warning.dark': '#b45309',
  'error.main': '#b91c1c',
  'error.light': '#fef2f2',
  'error.dark': '#b91c1c',
  'info.main': '#7847e3',
  'info.light': '#f7f5ff',
  'info.dark': '#6532c4',
  'text.primary': '#1e1233',
  'text.secondary': '#564a75',
  'text.disabled': '#7d6f9c',
  'background.default': '#faf9ff',
  'background.paper': '#ffffff',
  'action.hover': 'rgba(120,71,227,0.05)',
  'action.selected': 'rgba(120,71,227,0.10)',
  'action.disabled': '#9c8fbb',
  divider: '#ebe4f7',
};

/** Resuelve una ruta de color del tema a un valor CSS real. */
export function resolveColor(value, fallback = undefined) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  if (COLOR_MAP[value]) return COLOR_MAP[value];
  if (value.startsWith('divider')) return COLOR_MAP.divider;
  return value;
}

// ---------------------------------------------------------------------------
// Traducción de propiedades
// ---------------------------------------------------------------------------

/** Escala de espaciado MUI: número * 8px (y strings numéricos equivalentes). */
function space(v) {
  if (typeof v === 'number') return `${v * 8}px`;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
    return `${Number(v) * 8}px`;
  }
  return v;
}

/**
 * Dimensión: en MUI los números de tamaño (width, height, fontSize, top, ...)
 * son PÍXELES directos. Solo las utilidades de espaciado (p, m, gap) usan la
 * escala de 8px.
 */
function dim(v) {
  if (typeof v === 'number') return `${v}px`;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
    return `${Number(v)}px`;
  }
  return v;
}

/**
 * Radio de borde: MUI multiplica el número por `theme.shape.borderRadius`
 * (la app define 8). Se conserva esa semántica para no alterar el diseño.
 */
function radius(v) {
  if (typeof v === 'number') return `${v * 8}px`;
  return v;
}

/** `border: '1px solid'` sin color hereda el color del divisor de la marca. */
function borderVal(v) {
  if (typeof v === 'string' && /^\d/.test(v) && !/#|rgb|hsl|var\(/.test(v)) {
    return `${v} #ebe4f7`;
  }
  return v;
}

/**
 * Tabla de conversión `sx` -> CSS.
 * Cada entrada devuelve un objeto con una o varias propiedades CSS.
 */
const MAPPERS = {
  // Espaciado
  p: (v) => ({ padding: space(v) }),
  padding: (v) => ({ padding: space(v) }),
  px: (v) => ({ paddingLeft: space(v), paddingRight: space(v) }),
  py: (v) => ({ paddingTop: space(v), paddingBottom: space(v) }),
  pt: (v) => ({ paddingTop: space(v) }),
  pb: (v) => ({ paddingBottom: space(v) }),
  pl: (v) => ({ paddingLeft: space(v) }),
  pr: (v) => ({ paddingRight: space(v) }),
  m: (v) => ({ margin: space(v) }),
  margin: (v) => ({ margin: space(v) }),
  mx: (v) => ({ marginLeft: space(v), marginRight: space(v) }),
  my: (v) => ({ marginTop: space(v), marginBottom: space(v) }),
  mt: (v) => ({ marginTop: space(v) }),
  mb: (v) => ({ marginBottom: space(v) }),
  ml: (v) => ({ marginLeft: space(v) }),
  mr: (v) => ({ marginRight: space(v) }),
  gap: (v) => ({ gap: space(v) }),
  rowGap: (v) => ({ rowGap: space(v) }),
  columnGap: (v) => ({ columnGap: space(v) }),

  // Dimensiones
  width: (v) => ({ width: dim(v) }),
  height: (v) => ({ height: dim(v) }),
  minWidth: (v) => ({ minWidth: dim(v) }),
  minHeight: (v) => ({ minHeight: dim(v) }),
  maxWidth: (v) => ({ maxWidth: dim(v) }),
  maxHeight: (v) => ({ maxHeight: dim(v) }),

  // Flex / grid
  display: (v) => ({ display: v }),
  flex: (v) => ({ flex: String(v) }),
  flexGrow: (v) => ({ flexGrow: String(v) }),
  flexShrink: (v) => ({ flexShrink: String(v) }),
  flexBasis: (v) => ({ flexBasis: dim(v) }),
  flexDirection: (v) => ({ flexDirection: v }),
  flexWrap: (v) => ({ flexWrap: v }),
  alignItems: (v) => ({ alignItems: v }),
  justifyContent: (v) => ({ justifyContent: v }),
  alignSelf: (v) => ({ alignSelf: v }),
  justifySelf: (v) => ({ justifySelf: v }),
  gridTemplateColumns: (v) => ({ gridTemplateColumns: v }),
  gridTemplateRows: (v) => ({ gridTemplateRows: v }),
  gridColumn: (v) => ({ gridColumn: v }),
  gridRow: (v) => ({ gridRow: v }),
  order: (v) => ({ order: String(v) }),
  textAlign: (v) => ({ textAlign: v }),

  // Posicionamiento
  position: (v) => ({ position: v }),
  top: (v) => ({ top: dim(v) }),
  right: (v) => ({ right: dim(v) }),
  bottom: (v) => ({ bottom: dim(v) }),
  left: (v) => ({ left: dim(v) }),
  inset: (v) => ({ inset: dim(v) }),
  zIndex: (v) => ({ zIndex: String(v) }),
  overflow: (v) => ({ overflow: v }),
  overflowX: (v) => ({ overflowX: v }),
  overflowY: (v) => ({ overflowY: v }),

  // Tipografía
  fontWeight: (v) => ({ fontWeight: String(v) }),
  fontSize: (v) => ({ fontSize: dim(v) }),
  lineHeight: (v) => ({ lineHeight: typeof v === 'number' ? String(v) : v }),
  letterSpacing: (v) => ({ letterSpacing: typeof v === 'number' ? `${v}px` : v }),
  textTransform: (v) => ({ textTransform: v }),
  whiteSpace: (v) => ({ whiteSpace: v }),
  textOverflow: (v) => ({ textOverflow: v }),
  textDecoration: (v) => ({ textDecoration: v }),
  fontFamily: (v) => ({ fontFamily: v }),
  fontStyle: (v) => ({ fontStyle: v }),
  wordBreak: (v) => ({ wordBreak: v }),

  // Color
  color: (v) => ({ color: resolveColor(v) }),
  bgcolor: (v) => ({ backgroundColor: resolveColor(v) }),
  backgroundColor: (v) => ({ backgroundColor: resolveColor(v) }),
  opacity: (v) => ({ opacity: String(v) }),
  background: (v) => ({ background: v }),
  backgroundImage: (v) => ({ backgroundImage: v }),
  backgroundSize: (v) => ({ backgroundSize: v }),
  backgroundPosition: (v) => ({ backgroundPosition: v }),
  backgroundRepeat: (v) => ({ backgroundRepeat: v }),
  backgroundAttachment: (v) => ({ backgroundAttachment: v }),

  // Bordes
  border: (v) => ({ border: borderVal(v) }),
  borderTop: (v) => ({ borderTop: borderVal(v) }),
  borderBottom: (v) => ({ borderBottom: borderVal(v) }),
  borderLeft: (v) => ({ borderLeft: borderVal(v) }),
  borderRight: (v) => ({ borderRight: borderVal(v) }),
  borderColor: (v) => ({ borderColor: resolveColor(v) }),
  borderRadius: (v) => ({ borderRadius: radius(v) }),
  borderWidth: (v) => ({ borderWidth: dim(v) }),
  borderStyle: (v) => ({ borderStyle: v }),

  // Efectos
  boxShadow: (v) => ({ boxShadow: v }),
  textShadow: (v) => ({ textShadow: v }),
  filter: (v) => ({ filter: v }),
  backdropFilter: (v) => ({ backdropFilter: v }),
  WebkitBackdropFilter: (v) => ({ WebkitBackdropFilter: v }),
  transform: (v) => ({ transform: v }),
  transformOrigin: (v) => ({ transformOrigin: v }),
  transition: (v) => ({ transition: v }),
  cursor: (v) => ({ cursor: v }),
  visibility: (v) => ({ visibility: v }),
  pointerEvents: (v) => ({ pointerEvents: v }),
  userSelect: (v) => ({ userSelect: v }),
  objectFit: (v) => ({ objectFit: v }),
  aspectRatio: (v) => ({ aspectRatio: String(v) }),
  listStyle: (v) => ({ listStyle: v }),

  // Compatibilidad con el patrón `background-clip: text`
  WebkitBackgroundClip: (v) => ({ WebkitBackgroundClip: v }),
  backgroundClip: (v) => ({ backgroundClip: v }),
  WebkitTextFillColor: (v) => ({ WebkitTextFillColor: v }),
};

/** ¿Es un objeto responsive `{ xs, sm, md, lg, xl }`? */
function isResponsiveObject(v) {
  return (
    v != null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0 &&
    Object.keys(v).every((k) => Object.prototype.hasOwnProperty.call(BREAKPOINTS, k))
  );
}

/** Elige el valor del objeto responsive que corresponde al viewport actual. */
function pickResponsive(obj) {
  const bp = activeBreakpoint(currentWidth);
  let chosen;
  for (const [key, min] of Object.entries(BREAKPOINTS)) {
    if (obj[key] !== undefined && currentWidth >= min) chosen = obj[key];
  }
  return chosen !== undefined ? chosen : obj[bp];
}

/** Convierte un objeto de estilos `sx` a un objeto de estilos de React. */
function convert(input, themeArg) {
  if (input == null || input === false) return {};

  // Callbacks: `sx={theme => ({...})}` (MUI) — se evalúan con el tema de marca.
  if (typeof input === 'function') {
    return convert(input(themeArg), themeArg);
  }

  if (Array.isArray(input)) {
    return input.reduce((acc, item) => Object.assign(acc, convert(item, themeArg)), {});
  }

  if (typeof input !== 'object') return {};

  const out = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (rawValue === undefined || rawValue === null) continue;

    // Anidados (selectores/media queries): no válidos en estilos inline.
    // Su comportamiento lo cubren ahora las clases Tailwind del design system.
    if (rawKey.startsWith('&') || rawKey.startsWith('@') || rawKey.includes(' ')) continue;

    const mapper = MAPPERS[rawKey];
    if (!mapper) continue;

    let value = rawValue;

    // Callbacks POR PROPIEDAD. MUI admite una función de tema en CUALQUIER
    // propiedad (`backgroundImage: (theme) => theme.academix.gradientHero`,
    // `transition: (theme) => theme.transitions.create(...)`), no solo como
    // valor raíz del `sx`. Sin resolverla aquí, React recibía una FUNCIÓN como
    // valor de estilo: no es un valor CSS válido, así que la descartaba en
    // silencio y las tarjetas hero (dashboard, panel del servidor, consola de
    // super admin, perfil) quedaban SIN fondo — texto blanco sobre blanco.
    //
    // El try/catch es deliberado: un callback que consulte una utilidad no
    // incluida en `themeArg` (p. ej. `theme.transitions`) devolvería
    // `undefined.algo()` y tumbaría el render de TODA la página en blanco. Un
    // estilo opcional que no se puede resolver debe perderse, nunca romper la
    // aplicación.
    if (typeof value === 'function') {
      try {
        value = value(themeArg);
      } catch {
        continue;
      }
    }

    if (isResponsiveObject(value)) value = pickResponsive(value);
    if (value === undefined || value === null) continue;
    if (isResponsiveObject(value)) continue; // responsive anidado no soportado

    Object.assign(out, mapper(value));
  }
  return out;
}

/**
 * Paleta y utilidades de marca expuestas como `theme.academix`.
 *
 * ⚠️ BUG DE CONTRASTE que corrigió la verificación visual:
 *   Varios componentes declaran sus degradados como callback de tema dentro
 *   de `sx({...})`, p. ej. `backgroundImage: (theme) => theme.academix?.gradientHero`.
 *   Como este objeto `themeArg` NO exponía la clave `academix`, el callback
 *   devolvía `undefined`, el estilo se descartaba en silencio y las tarjetas
 *   hero (dashboard, panel del servidor, consola de super admin y perfil)
 *   quedaban SIN fondo: texto blanco sobre blanco, es decir, ilegibles.
 *   Al declarar aquí la misma rampa que el tema de `App.jsx`, los callbacks
 *   vuelven a resolver y los degradados se pintan.
 */
const academixPalette = {
  purple900: '#241046',
  purple800: '#2f1657',
  purple700: '#6532c4',
  purple600: '#7847e3',
  purple500: '#8f6bf2',
  lilac600: '#6532c4',
  lilac500: '#8f6bf2',
  lilac400: '#ad93fb',
  lilac300: '#cdbcff',
  lilac200: '#e3dbff',
  lilac100: '#f0ebff',
  lilac50: '#f7f5ff',
  ink: '#1e1233',
  slate: '#564a75',
  slateLight: '#7d6f9c',
  bg: '#faf9ff',
  surface: '#ffffff',
  surfaceHover: '#f4f1fd',
  line: '#ebe4f7',
  lineHover: '#d8cdee',
  success: '#047857',
  warning: '#b45309',
  error: '#b91c1c',
  info: '#7847e3',
};

const academixTheme = {
  palette: academixPalette,
  gradientPrimary: `linear-gradient(135deg, ${academixPalette.purple700} 0%, ${academixPalette.purple500} 100%)`,
  gradientAccent: `linear-gradient(135deg, ${academixPalette.lilac500} 0%, ${academixPalette.lilac400} 100%)`,
  gradientHero: `linear-gradient(135deg, ${academixPalette.purple800} 0%, ${academixPalette.purple600} 45%, ${academixPalette.lilac600} 100%)`,
  gradientSidebar: `linear-gradient(180deg, ${academixPalette.purple900} 0%, #1a0b33 100%)`,
  shadowSm: '0 1px 3px rgba(58,28,118,0.08), 0 1px 2px rgba(58,28,118,0.06)',
  shadowMd: '0 6px 20px rgba(58,28,118,0.10), 0 2px 8px rgba(58,28,118,0.06)',
  shadowLg: '0 20px 50px rgba(58,28,118,0.16), 0 4px 16px rgba(58,28,118,0.08)',
};

/** Tema mínimo disponible para callbacks de `sx` (compatibilidad). */
const themeArg = {
  academix: academixTheme,
  palette: {
    primary: { main: '#7847e3', light: '#8f6bf2', dark: '#3d1c76' },
    secondary: { main: '#ad93fb', light: '#cdbcff', dark: '#7847e3' },
    background: { default: '#faf9ff', paper: '#ffffff' },
    text: { primary: '#1e1233', secondary: '#564a75', disabled: '#7d6f9c' },
    divider: '#ebe4f7',
    action: { hover: 'rgba(120,71,227,0.05)', selected: 'rgba(120,71,227,0.10)' },
  },
  breakpoints: BREAKPOINTS,
  // Utilidades de transición equivalentes a las de MUI: hay código heredado
  // que las consulta dentro de un callback de `sx`
  // (`transition: (theme) => theme.transitions.create('box-shadow', {...})`).
  // Sin esta clave, ese callback lanzaba `undefined.create(...)`.
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    create(props, options) {
      const o = options || {};
      const duration = typeof o.duration === 'number'
        ? o.duration
        : (this.duration[o.duration] ?? this.duration.standard);
      const easing = typeof o.easing === 'string'
        ? o.easing
        : (this.easing[o.easing] ?? this.easing.easeInOut);
      const delay = o.delay || 0;
      const list = Array.isArray(props) ? props : [props];
      return list.map((p) => `${p} ${duration}ms ${easing} ${delay}ms`).join(',');
    },
  },
};

/**
 * API pública.
 *
 * @param {object|array|function} input Declaración de estilos estilo `sx`.
 * @returns {object} Objeto `style` listo para React.
 */
export function sx(input) {
  return convert(input, themeArg);
}

/** Combina varios objetos `style` (útil al fusionar clases y estilos). */
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles.filter(Boolean));
}

export default sx;
