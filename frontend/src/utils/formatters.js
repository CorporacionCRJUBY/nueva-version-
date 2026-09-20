// FILE: frontend/src/utils/formatters.js
/**
 * Utilidades para formateo de datos
 */

/**
 * Convierte una ruta relativa devuelta por el backend (p.ej. "/uploads/images/x.png")
 * en una URL absoluta que el navegador pueda cargar. VITE_API_URL apunta a
 * ".../api", pero los archivos estáticos se sirven fuera de ese prefijo, así
 * que hay que quitarlo antes de anteponer la ruta del archivo.
 */
export const getFileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const origin = apiUrl.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

/**
 * Formatea una fecha a string localizado
 */
export const formatDate = (date, locale = 'en-US') => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formatea una fecha y hora
 */
export const formatDateTime = (date, locale = 'en-US') => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea un número como moneda
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Formatea un número como porcentaje
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Formatea un número con separadores de miles
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Trunca un texto a una longitud máxima
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Capitaliza la primera letra de un string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Obtiene el nombre completo a partir de nombre y apellido
 */
export const getFullName = (firstName, lastName) => {
  if (!firstName && !lastName) return '-';
  return `${firstName || ''} ${lastName || ''}`.trim();
};

/**
 * Formatea el tamaño de un archivo
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Genera un color a partir de un string (para avatares)
 */
export const stringToColor = (str) => {
  if (!str) return '#000000';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

/**
 * Obtiene las iniciales de un nombre
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

/**
 * Formatea una duración en minutos a formato legible
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

/**
 * Obtiene el estado de asistencia traducido
 */
export const getAttendanceStatusLabel = (status, t) => {
  const labels = {
    P: t('attendance.present'),
    O: t('attendance.online'),
    E: t('attendance.excused'),
    U: t('attendance.unexcused'),
  };
  return labels[status] || status;
};

/**
 * Obtiene el color para el estado de asistencia
 */
export const getAttendanceStatusColor = (status) => {
  const colors = {
    P: 'success',
    O: 'info',
    E: 'warning',
    U: 'error',
  };
  return colors[status] || 'default';
};

/**
 * Obtiene el color para el estado de calificación
 */
export const getGradeStatusColor = (status) => {
  const colors = {
    DRAFT: 'default',
    PUBLISHED: 'success',
    LOCKED: 'error',
    UNLOCKED: 'warning',
  };
  return colors[status] || 'default';
};

/**
 * Obtiene el color para el estado de beca
 */
export const getScholarshipStatusColor = (status) => {
  const colors = {
    REQUESTED: 'warning',
    UNDER_REVIEW: 'info',
    APPROVED: 'success',
    REJECTED: 'error',
    ACTIVE: 'success',
    SUSPENDED: 'warning',
    EXPIRED: 'default',
    CANCELLED: 'error',
  };
  return colors[status] || 'default';
};