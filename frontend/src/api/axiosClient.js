// FILE: frontend/src/api/axiosClient.js
import axios from 'axios';

// Configuración base
// FIX (auditoria hallazgo B2): el fallback local debe incluir el prefijo
// `/api`, igual que el VITE_API_URL del .env — antes apuntaba a la raíz del
// servidor y ninguna ruta de la API habría resuelto sin la variable de entorno.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// FIX (auditoria hallazgo medio #2 - JWT en localStorage): el token ya no
// se lee de localStorage ni se manda a mano como header Authorization —
// eso es justamente lo que lo exponía a robo por XSS. El backend ahora lo
// entrega en una cookie httpOnly (ver backend/src/utils/cookies.js), así
// que basta con `withCredentials: true` para que el navegador la adjunte
// automáticamente en cada request; JS (y por lo tanto un XSS) no puede
// leerla ni manipularla.
const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// FIX (auditoria hallazgo alto A1 - tormenta de refresh): si varios 401
// concurren, cada uno lanzaba su propio POST /auth/refresh; como el backend
// rota la cookie de refresh, el segundo refresh llegaba con una cookie ya
// invalidada, fallaba y el catch ejecutaba el logout, expulsando al usuario
// injustamente. Con este singleton el primer 401 crea la promesa de refresh
// y todos los 401 concurrentes la reutilizan; al resolverse (éxito o fallo)
// se limpia y cada petición reintenta la suya una sola vez.
let refreshPromise = null;

// Interceptor para manejar respuestas
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no es un intento de refresh
    // FIX (hallazgo de testeo en vivo): un 401 en /auth/login o
    // /auth/2fa/verify significa CREDENCIALES INVÁLIDAS, no sesión expirada.
    // Antes, el login fallido entraba al flujo de refresh (que también
    // fallaba sin cookie) y el error que veía el usuario era el mensaje
    // técnico "Request failed with status code 401" del refresh en vez del
    // "Invalid credentials" del backend.
    const isAuthChallenge =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/2fa/verify');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthChallenge) {
      originalRequest._retry = true;

      try {
        // El refresh token vive en una cookie httpOnly con path=/api/auth
        // (ver backend/src/utils/cookies.js): el navegador la manda sola
        // gracias a `withCredentials`, no hay nada que leer de localStorage
        // ni que mandar en el body. El backend responde con Set-Cookie
        // rotando accessToken/refreshToken (ver auth.service.js).
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null;
            });
        }
        await refreshPromise;

        // Reintentar la petición original; la cookie ya trae el token nuevo.
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, el backend ya limpió las cookies (ver
        // controller.refresh). Solo queda limpiar el estado local no
        // sensible y redirigir al login.
        localStorage.removeItem('user');

        // Redirigir a login si no estamos ya en la página de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Formatear errores
    const errorResponse = {
      success: false,
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errors: error.response?.data?.errors || [],
      status: error.response?.status || 500,
    };

    // Log de errores en desarrollo
    if (import.meta.env.DEV) {
      console.error('[API Error]', errorResponse);
    }

    // FIX (auditoria hallazgo medio M4 - errores silenciados): la mayoría de
    // los ListPages solo hacen console.error en su catch, así que el usuario
    // nunca se entera de que algo falló. Despachamos un evento global que
    // recoge GlobalErrorSnackbar (montado en MainLayout/AuthLayout). Se omite
    // el 401 (de eso se encarga el flujo de refresh/logout de arriba) y las
    // peticiones abortadas (ERR_CANCELED), que no son errores reales.
    if (error.response?.status !== 401 && error.code !== 'ERR_CANCELED') {
      window.dispatchEvent(
        new CustomEvent('academix:api-error', {
          detail: { message: error.response?.data?.message || error.message },
        })
      );
    }

    return Promise.reject(errorResponse);
  }
);

// Métodos auxiliares
export const api = {
  get: (url, config = {}) => axiosClient.get(url, config),
  post: (url, data = {}) => axiosClient.post(url, data),
  put: (url, data = {}) => axiosClient.put(url, data),
  patch: (url, data = {}) => axiosClient.patch(url, data),
  delete: (url) => axiosClient.delete(url),
  upload: (url, formData, onProgress) => {
    // FIX (auditoria hallazgo B5): sin el header Content-Type manual — fijar
    // 'multipart/form-data' a mano impide que axios/navegador genere el
    // boundary correcto y rompe la subida. Dejamos que lo establezca solo.
    return axiosClient.post(url, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  // Descarga un archivo protegido (foto, PDF) con el token de auth y devuelve
  // un object URL temporal listo para <img src> o window.open(). El caller es
  // responsable de revocar la URL con URL.revokeObjectURL cuando ya no la use.
  getBlobUrl: async (url) => {
    const data = await axiosClient.get(url, { responseType: 'blob' });
    const blob = new Blob([data]);
    return URL.createObjectURL(blob);
  },
  download: async (url, filename) => {
    // El interceptor de respuesta de axiosClient ya hace `return response.data`,
    // así que aquí `data` ES el blob (no un objeto de respuesta de axios con
    // una propiedad .data). Antes este método devolvía `response.data`, que
    // en un Blob es siempre `undefined`.
    const data = await axiosClient.get(url, {
      responseType: 'blob',
    });
    const blob = new Blob([data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    return blob;
  },
};

// Helper para manejar paginación
export const paginate = (data, page = 1, pageSize = 20) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    data: data.slice(start, end),
    total: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
};

export default axiosClient;