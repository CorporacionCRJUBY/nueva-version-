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
    // FIX (bitácora 2026-09-15): el backend responde SIEMPRE con el sobre
    // `{ success:false, error:{ message, status, code, details } }` (ver
    // backend/src/middleware/errorHandler.middleware.js y validate.middleware.js),
    // pero aquí se leía `data.message` / `data.code`, que no existen. El
    // resultado: el usuario veía el texto genérico de axios ("Request failed
    // with status code 400") en vez del motivo real, en TODOS los formularios.
    const payload = error.response?.data || {};
    const backendError = payload.error || payload;
    const details = backendError.details || payload.errors || [];

    // Los 400 de express-validator traen `details` con un ítem por campo:
    // se arma un mensaje accionable ("Peso: Weight must be between 0 and 1").
    const detailMessage = Array.isArray(details) && details.length
      ? details
          .map((d) => (d?.path ? `${d.path}: ${d.msg}` : d?.msg))
          .filter(Boolean)
          .join(' · ')
      : null;

    const errorResponse = {
      success: false,
      code: backendError.code || 'UNKNOWN_ERROR',
      message:
        detailMessage ||
        backendError.message ||
        error.message ||
        'An unexpected error occurred',
      errors: details,
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
    // Un 403 en un GET es "este rol no ve este módulo", no un fallo: el panel
    // consulta varios módulos a la vez y cada 403 pintaba un snackbar rojo.
    const isForbiddenRead =
      error.response?.status === 403 &&
      (originalRequest?.method || 'get').toLowerCase() === 'get';

    if (error.response?.status !== 401 && !isForbiddenRead && error.code !== 'ERR_CANCELED') {
      window.dispatchEvent(
        new CustomEvent('academix:api-error', {
          detail: { message: errorResponse.message },
        })
      );
    }

    return Promise.reject(errorResponse);
  }
);

// FIX (bitácora 2026-09-15): en el log CADA lectura aparece dos veces seguidas
// (un 200 y su 304 gemelo: /api/students, /api/branches, /api/academic-years...
// cientos de pares). El doble montaje de efectos de React.StrictMode dispara
// dos veces la misma consulta, y varias pantallas cargan los mismos catálogos
// a la vez. Aquí se comparte la promesa de los GET idénticos que siguen en
// vuelo: la segunda llamada no abre una petición nueva, se cuelga de la
// primera. Solo afecta a GET (nunca a POST/PUT/DELETE) y la entrada se borra
// en cuanto la petición termina, así que no es una caché: dos lecturas
// separadas en el tiempo siguen yendo al servidor.
const inFlightReads = new Map();

const readKey = (url, config) => {
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${url}?${params}`;
};

const dedupedGet = (url, config = {}) => {
  // Una petición con señal de aborto propia no se comparte: cancelarla
  // afectaría también al otro consumidor.
  if (config.signal || config.cancelToken) {
    return axiosClient.get(url, config);
  }

  const key = readKey(url, config);
  const pending = inFlightReads.get(key);
  if (pending) return pending;

  const request = axiosClient.get(url, config).finally(() => {
    inFlightReads.delete(key);
  });

  inFlightReads.set(key, request);
  return request;
};

// Métodos auxiliares
export const api = {
  get: (url, config = {}) => dedupedGet(url, config),
  post: (url, data = {}) => axiosClient.post(url, data),
  put: (url, data = {}) => axiosClient.put(url, data),
  patch: (url, data = {}) => axiosClient.patch(url, data),
  delete: (url) => axiosClient.delete(url),
  upload: (url, formData, onProgress) => {
    // FIX (auditoria hallazgo B5): sin el header Content-Type manual — fijar
    // 'multipart/form-data' a mano impide que axios/navegador genere el
    // boundary correcto y rompe la subida. Dejamos que lo establezca solo.
    // FIX (bitácora 2026-09-15): TODAS las subidas devolvían 400 "No file
    // uploaded" (POST /api/documents/upload, POST /api/students/:id/photo).
    // La instancia de axios fija 'Content-Type: application/json' por defecto
    // y axios >= 1.x, al ver ese header, CONVIERTE el FormData a JSON — el
    // archivo se pierde por el camino y al backend le llega un JSON sin
    // multipart, por lo que multer no encuentra ningún archivo. Poniendo el
    // header en undefined, axios lo calcula solo con su boundary.
    return axiosClient.post(url, formData, {
      headers: { 'Content-Type': undefined },
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
  //
  // FIX (previsualización de documentos): antes se hacía `new Blob([data])`,
  // que crea un blob NUEVO sin tipo MIME — se perdía el `application/pdf` /
  // `image/*` de la respuesta y el <iframe> no podía abrir el PDF con el
  // visor del navegador. Ahora se conserva el blob original y, si se indica
  // `mimeType`, se fuerza ese tipo (útil cuando el servidor responde con un
  // genérico application/octet-stream).
  getBlobUrl: async (url, mimeType) => {
    const data = await axiosClient.get(url, { responseType: 'blob' });
    const source = data instanceof Blob ? data : new Blob([data]);
    const blob =
      mimeType && source.type !== mimeType ? new Blob([source], { type: mimeType }) : source;
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
    const blob = data instanceof Blob ? data : new Blob([data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Se libera con retraso: revocar en el mismo tick cancela la descarga en
    // algunos navegadores.
    const href = link.href;
    setTimeout(() => URL.revokeObjectURL(href), 1000);
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