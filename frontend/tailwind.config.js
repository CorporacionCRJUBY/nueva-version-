// FILE: frontend/tailwind.config.js
/**
 * ACADEMIX 2.0 — Design System (Tailwind CSS)
 * New Direction Academy · Academic Management System
 *
 * PALETA MORADO / LILA — la identidad de ACADEMIX: sidebar morado profundo
 * (#241046), acento morado (#7847e3) y acento lila (#ad93fb), lienzo lavanda
 * muy claro (#faf9ff), tipografía Outfit, tarjetas blancas con borde hairline
 * lavanda y radios contenidos.
 *
 * Toda la identidad visual vive aquí. Cambiar un token reestiliza la
 * aplicación completa (los componentes usan clases semánticas, nunca colores
 * literales dispersos en el código).
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Marca: violeta primario (acción, foco, enlaces) ---
        // Valores tomados del diseño de referencia: #7c3aed sobre lienzo #f5f3ff.
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
          950: '#2e1065',
        },
        // --- Acento lila (secundario, degradados suaves) ---
        lilac: {
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
        // --- Superficie corporativa (índigo-violeta profundo del sidebar) ---
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#4c1d95',
          900: '#2d1b69',
          950: '#1e1b4b',
        },
        navy: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#4c1d95',
          900: '#2d1b69',
          950: '#1e1b4b',
        },
        // --- Lienzo y superficies (matiz lavanda de la referencia) ---
        canvas: '#f5f3ff',
        surface: {
          DEFAULT: '#ffffff',
          2: '#f5f3ff',
          3: '#ede9fe',
        },
        hover: '#f5f3ff',
        line: {
          DEFAULT: '#ddd6fe',
          subtle: '#ede9fe',
          strong: '#c4b5fd',
        },
        // --- Tinta (texto): #1e1b4b títulos, #7c6faa etiquetas ---
        ink: {
          DEFAULT: '#1e1b4b',
          soft: '#6b5b95',
          muted: '#7c6faa',
          faint: '#a78bfa',
        },
        // --- Semánticos (ajustados para AA sobre blanco y sobre su propio tinte) ---
        success: { DEFAULT: '#047857', light: '#ecfdf5', dark: '#047857' },
        warning: { DEFAULT: '#b45309', light: '#fffbeb', dark: '#b45309' },
        danger: { DEFAULT: '#b91c1c', light: '#fef2f2', dark: '#b91c1c' },
        info: { DEFAULT: '#7c3aed', light: '#f5f3ff', dark: '#6d28d9' },
        // --- Sidebar corporativo (gradiente #1e1b4b -> #2d1b69) ---
        // `item` se aclara respecto a la referencia (#9d8dc4 -> #a99bd0) para
        // mejorar el contraste del texto de navegación sobre el morado profundo.
        sidebar: {
          DEFAULT: '#1e1b4b',
          deep: '#191241',
          light: '#2d1b69',
          // CONTRASTE (2026-09-19): '#a99bd0' quedaba demasiado apagado sobre el
          // violeta profundo del sidebar en pantallas con brillo bajo. '#bcb0e0'
          // sube el ratio sin competir con el blanco de la opción activa.
          item: '#bcb0e0',
          active: '#7c3aed',
        },
      },
      fontFamily: {
        /* Referencia: títulos en Outfit, cuerpo en Inter, código en JetBrains Mono. */
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.65rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.8rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.1rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        // Escala refinada estilo Figma: sombras suaves, multicapa y de bajo
        // contraste, con tinte violeta en vez de negro puro para que se
        // integren con el lienzo lavanda.
        xs: '0 1px 2px rgba(30, 27, 75, 0.04)',
        sm: '0 1px 3px rgba(30, 27, 75, 0.06), 0 1px 2px rgba(30, 27, 75, 0.04)',
        md: '0 4px 16px rgba(30, 27, 75, 0.07), 0 2px 6px rgba(30, 27, 75, 0.04)',
        lg: '0 12px 36px rgba(30, 27, 75, 0.10), 0 4px 12px rgba(30, 27, 75, 0.05)',
        xl: '0 24px 64px rgba(30, 27, 75, 0.16), 0 8px 20px rgba(30, 27, 75, 0.07)',
        '2xl': '0 32px 80px rgba(30, 27, 75, 0.20)',
        brand: '0 4px 16px rgba(124, 58, 237, 0.26)',
        'brand-lg': '0 12px 34px rgba(124, 58, 237, 0.32)',
        'brand-glow': '0 0 0 4px rgba(124, 58, 237, 0.12)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        'inset-line': 'inset 0 0 0 1px rgba(124, 58, 237, 0.08)',
        none: 'none',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
        'brand-gradient-h': 'linear-gradient(90deg, #6d28d9 0%, #8b5cf6 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        'accent-gradient': 'linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)',
        // Panel del login de la referencia: #2d1b69 -> #4c1d95 -> #6d28d9
        'hero-gradient': 'linear-gradient(145deg, #2d1b69 0%, #4c1d95 50%, #6d28d9 100%)',
        // Sidebar de la referencia: #1e1b4b -> #2d1b69
        'sidebar-gradient': 'linear-gradient(180deg, #1e1b4b 0%, #2d1b69 100%)',
        'sidebar-gradient-rich':
          'radial-gradient(120% 80% at 0% 0%, rgba(124,58,237,0.35) 0%, transparent 55%), linear-gradient(180deg, #1e1b4b 0%, #2d1b69 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(167,139,250,0.02) 50%, transparent 100%)',
        'grid-pattern':
          'linear-gradient(rgba(124,58,237,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.07) 1px, transparent 1px)',
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      // Tailwind usa azul (#3b82f6) como color de anillo por defecto; se alinea
      // con la paleta morada para que no quede ningún azul residual en el CSS.
      ringColor: {
        DEFAULT: '#7c3aed',
      },
      ringOffsetColor: {
        DEFAULT: '#ffffff',
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        68: '17rem',
        72: '18rem',
        84: '21rem',
      },
      zIndex: {
        drawer: '1200',
        appbar: '1100',
        modal: '1300',
        tooltip: '1500',
        snackbar: '1400',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        indeterminate: {
          '0%': { left: '-40%', width: '40%' },
          '60%': { left: '100%', width: '60%' },
          '100%': { left: '100%', width: '60%' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in-right': 'slideInRight 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'float-slow': 'float 6s ease-in-out infinite',
        orb: 'pulseGlow 4s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        indeterminate: 'indeterminate 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};