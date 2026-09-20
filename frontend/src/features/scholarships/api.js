// FILE: frontend/src/features/scholarships/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/scholarships';

export const scholarshipsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  updateStatus: (id, data) => api.post(`${BASE_URL}/${id}/status`, data),
};

export default scholarshipsApi;