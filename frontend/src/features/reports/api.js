// FILE: frontend/src/features/reports/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/reports';

export const reportsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  // pdf_url ya no existe (ver backend/src/app.js — se quitó /uploads público).
  // El PDF se pide con el token vía este endpoint y se abre como blob.
  getPreviewBlobUrl: (id) => api.getBlobUrl(`${BASE_URL}/${id}/preview`),
};

export default reportsApi;