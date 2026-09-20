// FILE: frontend/src/features/progressReports/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/progress-reports';

export const progressReportsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  generate: (id) => api.post(`${BASE_URL}/${id}/generate`),
  preview: (id) => api.download(`${BASE_URL}/${id}/preview`, `progress_report_${id}.pdf`),
};

export default progressReportsApi;