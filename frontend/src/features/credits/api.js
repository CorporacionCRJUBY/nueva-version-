// FILE: frontend/src/features/credits/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/credits';

export const creditsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  recalculate: (studentId) => api.post(`${BASE_URL}/recalculate/${studentId}`),
};

export default creditsApi;