// FILE: frontend/src/features/graduation/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/graduation';

export const graduationApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  validate: (studentId) => api.post(`${BASE_URL}/validate/${studentId}`),
};

export default graduationApi;