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
        // --- Marca: morado primario (acción, foco, enlaces) ---
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
          950: '#2a1256',
        },
        // --- Acento lila (secundario, degradados suaves) ---
        lilac: {
          50: '#f7f5ff',
          100: '#ece3fb',
          200: '#e3dbff',
          300: '#cdbcff',
          400: '#ad93fb',
          500: '#8f6bf2',
          600: '#7847e3',
          700: '#6532c4',
          800: '#53289f',
          900: '#3d1c76',
        },
        // --- Superficie corporativa (morado profundo con matiz lavanda) ---
        violet: {
          50: '#f7f5ff',
          100: '#ece3fb',
          200: '#cbb8f0',
          300: '#a48fc9',
          400: '#7a5aa8',
          500: '#5b3a8f',
          600: '#4a2270',
          700: '#3d1c76',
          800: '#2f1657',
          900: '#241046',
          950: '#1a0b33',
        },
        navy: {
          50: '#f7f5ff',
          100: '#ece3fb',
          200: '#cbb8f0',
          300: '#a48fc9',
          400: '#7a5aa8',
          500: '#5b3a8f',
          600: '#4a2270',
          700: '#3d1c76',
          800: '#2f1657',
          900: '#241046',
          950: '#1a0b33',
        },
        // --- Lienzo y superficies (matiz lavanda) ---
        canvas: '#faf9ff',
        surface: {
          DEFAULT: '#ffffff',
          2: '#faf9ff',
          3: '#f4f1fd',
        },
        hover: '#f4f1fd',
        line: {
          DEFAULT: '#ebe4f7',
          subtle: '#f4f1fd',
          strong: '#d8cdee',
        },
        // --- Tinta (texto) ---
        ink: {
          DEFAULT: '#1e1233',
          soft: '#564a75',
          muted: '#7d6f9c',
          faint: '#b9a9d9',
        },
        // --- Semánticos (ajustados para AA sobre blanco y sobre su propio tinte) ---
        success: { DEFAULT: '#047857', light: '#ecfdf5', dark: '#047857' },
        warning: { DEFAULT: '#b45309', light: '#fffbeb', dark: '#b45309' },
        danger: { DEFAULT: '#b91c1c', light: '#fef2f2', dark: '#b91c1c' },
        info: { DEFAULT: '#7847e3', light: '#f0ebff', dark: '#6532c4' },
        // --- Sidebar corporativo ---
        sidebar: {
          DEFAULT: '#241046',
          deep: '#1a0b33',
          light: '#2f1657',
          item: '#cdbcff',
          active: '#7847e3',
        },
      },
      fontFamily: {
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
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
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(30, 18, 51, 0.04)',
        sm: '0 1px 3px rgba(30, 18, 51, 0.06), 0 1px 2px rgba(30, 18, 51, 0.04)',
        md: '0 4px 12px rgba(30, 18, 51, 0.08), 0 1px 3px rgba(30, 18, 51, 0.04)',
        lg: '0 12px 32px rgba(30, 18, 51, 0.12), 0 2px 8px rgba(30, 18, 51, 0.06)',
        xl: '0 24px 60px rgba(30, 18, 51, 0.18)',
        brand: '0 4px 14px rgba(120, 71, 227, 0.28)',
        'brand-lg': '0 10px 30px rgba(120, 71, 227, 0.32)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        none: 'none',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6532c4 0%, #8f6bf2 100%)',
        'brand-gradient-h': 'linear-gradient(90deg, #6532c4 0%, #8f6bf2 100%)',
        'accent-gradient': 'linear-gradient(135deg, #ad93fb 0%, #cdbcff 100%)',
        'hero-gradient': 'linear-gradient(160deg, #241046 0%, #2f1657 55%, #6532c4 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #241046 0%, #1a0b33 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(120,71,227,0.04) 0%, rgba(173,147,251,0.02) 50%, transparent 100%)',
        'grid-pattern':
          'linear-gradient(rgba(120,71,227,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(120,71,227,0.07) 1px, transparent 1px)',
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      // Tailwind usa azul (#3b82f6) como color de anillo por defecto; se alinea
      // con la paleta morada para que no quede ningún azul residual en el CSS.
      ringColor: {
        DEFAULT: '#7847e3',
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
