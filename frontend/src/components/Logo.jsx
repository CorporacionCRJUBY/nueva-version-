// FILE: frontend/src/components/Logo.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { School } from 'lucide-react';
import { cn } from '../ui/cn';

/**
 * Marca "New Direction Academy".
 *
 * Usa el logo oficial (/logo.png) cuando está disponible y cae a un icono de
 * marca en caso contrario. El PNG es monocromático, por eso se monta sobre una
 * tarjeta blanca que garantiza contraste tanto en el sidebar azul marino como
 * en las cabeceras claras.
 *
 * Migrado a Tailwind CSS (antes usaba `sx` + Box/Typography de MUI).
 */
const Logo = ({
  size = 40,
  showText = true,
  text = 'NEW DIRECTION ACADEMY',
  textColor,
  fontSize,
  letterSpacing,
  withGlow = false,
  sx: _sx,
  useImage = true,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-white',
          withGlow ? 'shadow-brand ring-1 ring-brand-300/40' : 'shadow-sm'
        )}
        style={{ width: size, height: size, minWidth: size }}
      >
        {useImage ? (
          <img
            src="/logo.png"
            alt="New Direction Academy"
            className="h-full w-full object-contain"
            loading="eager"
            decoding="async"
          />
        ) : (
          <School style={{ width: size * 0.58, height: size * 0.58 }} className="text-brand-700" />
        )}
      </span>

      {showText && (
        <span
          className={cn(
            'font-display font-extrabold leading-none whitespace-nowrap',
            textColor === 'light' ? 'text-white' : 'gradient-text'
          )}
          style={{
            fontSize: typeof fontSize === 'object' ? undefined : fontSize || '1.05rem',
            letterSpacing: typeof letterSpacing === 'number' ? `${letterSpacing}px` : undefined,
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
};

Logo.propTypes = {
  size: PropTypes.number,
  showText: PropTypes.bool,
  text: PropTypes.string,
  textColor: PropTypes.oneOf(['light', 'default']),
  fontSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object]),
  letterSpacing: PropTypes.number,
  withGlow: PropTypes.bool,
  sx: PropTypes.object,
  useImage: PropTypes.bool,
  className: PropTypes.string,
};

export default Logo;
