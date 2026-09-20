// FILE: frontend/src/features/documents/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/documents';

export const documentsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  upload: (formData, onProgress) => {
    return api.upload(BASE_URL + '/upload', formData, onProgress);
  },
  download: (id, filename) => api.download(`${BASE_URL}/${id}/download`, filename),
  // FIX (2026-09-17, previsualización de documentos): trae el archivo como
  // blob autenticado (misma técnica que las fotos de estudiante) y devuelve
  // una object URL lista para <img>/<iframe> — nunca se navega directo a la
  // URL de la API porque la sesión vive en una cookie httpOnly, no en algo
  // que un <img src> pueda mandar de forma confiable en todos los entornos.
  getPreviewBlobUrl: (id, mimeType) => api.getBlobUrl(`${BASE_URL}/${id}/preview`, mimeType),
};

export default documentsApi;